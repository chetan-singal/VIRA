package com.vira.dashboard;

import com.vira.bill.BillRepository;
import com.vira.bill.BillType;
import com.vira.common.FieldValidationException;
import com.vira.common.Money;
import com.vira.common.NotFoundException;
import com.vira.daybook.DaybookService;
import com.vira.ledger.CashInHandRepository;
import com.vira.supplier.SupplierPaymentResponse;
import com.vira.supplier.SupplierPaymentService;
import com.vira.voucher.PaymentVoucherRepository;
import com.vira.voucher.PaymentVoucherResponse;
import com.vira.voucher.PaymentVoucherService;

import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
public class DashboardService {

    private static final int MAX_DAILY_POINTS = 62;

    private final BillRepository bills;
    private final PaymentVoucherRepository vouchers;
    private final CashInHandRepository cashInHand;
    private final DaybookService daybook;
    private final PaymentVoucherService voucherService;
    private final SupplierPaymentService supplierPaymentService;

    public DashboardService(BillRepository bills, PaymentVoucherRepository vouchers,
                            CashInHandRepository cashInHand, DaybookService daybook,
                            PaymentVoucherService voucherService,
                            SupplierPaymentService supplierPaymentService) {
        this.bills = bills;
        this.vouchers = vouchers;
        this.cashInHand = cashInHand;
        this.daybook = daybook;
        this.voucherService = voucherService;
        this.supplierPaymentService = supplierPaymentService;
    }

    private record Range(LocalDate from, LocalDate to) {
    }

    @Transactional(readOnly = true)
    public DashboardResponse dashboard(DashboardPeriod period, LocalDate customFrom,
                                       LocalDate customTo, int recent) {
        LocalDate today = LocalDate.now();
        Range range = switch (period) {
            case TODAY -> new Range(today, today);
            case MONTH -> new Range(today.withDayOfMonth(1), today.withDayOfMonth(today.lengthOfMonth()));
            case YEAR -> new Range(today.withDayOfYear(1), today.withDayOfYear(today.lengthOfYear()));
            case CUSTOM -> customRange(customFrom, customTo);
        };

        int limit = Math.max(1, Math.min(recent, 50));

        BigDecimal cash = nz(bills.sumGrandTotalActiveBetween(BillType.CASH, range.from(), range.to()));
        BigDecimal party = nz(bills.sumGrandTotalActiveBetween(BillType.PARTY, range.from(), range.to()));
        BigDecimal received = nz(vouchers.sumActiveBetween(range.from(), range.to()));
        BigDecimal cashBalance = cashInHand.findById(1L)
                .orElseThrow(() -> new NotFoundException("Cash in Hand row is missing"))
                .getBalance();

        DashboardResponse.Kpis kpis = new DashboardResponse.Kpis(
                Money.round(cash.add(party)), Money.round(cash), Money.round(party),
                Money.round(received), cashBalance, cashBalance.signum() < 0);

        boolean monthly = ChronoUnit.DAYS.between(range.from(), range.to()) + 1 > MAX_DAILY_POINTS;

        Pageable newest = PageRequest.of(0, limit, Sort.by(Sort.Direction.DESC, "paymentDate", "id"));
        List<PaymentVoucherResponse> recentPayments =
                voucherService.list(null, null, null, null, true, newest).content();
        List<SupplierPaymentResponse> recentSupplierPayments =
                supplierPaymentService.list(null, null, null, null, true, newest).content();

        return new DashboardResponse(period, range.from(), range.to(), kpis,
                monthly ? "MONTH" : "DAY", trend(range, monthly),
                daybook.recent(limit), recentPayments, recentSupplierPayments);
    }

    private Range customRange(LocalDate from, LocalDate to) {
        if (from == null || to == null) {
            throw new FieldValidationException("from", "From and To are required for a custom period");
        }
        if (from.isAfter(to)) {
            throw new FieldValidationException("to", "Must not be before the From date");
        }
        return new Range(from, to);
    }

    /** Zero-filled sales trend: one bucket per day, or per month for long ranges. */
    private List<DashboardResponse.TrendPoint> trend(Range range, boolean monthly) {
        Map<String, BigDecimal[]> buckets = new LinkedHashMap<>();
        if (monthly) {
            YearMonth last = YearMonth.from(range.to());
            for (YearMonth m = YearMonth.from(range.from()); !m.isAfter(last); m = m.plusMonths(1)) {
                buckets.put(m.toString(), new BigDecimal[] {BigDecimal.ZERO, BigDecimal.ZERO});
            }
        } else {
            for (LocalDate d = range.from(); !d.isAfter(range.to()); d = d.plusDays(1)) {
                buckets.put(d.toString(), new BigDecimal[] {BigDecimal.ZERO, BigDecimal.ZERO});
            }
        }

        for (Object[] row : bills.dailySalesActive(range.from(), range.to())) {
            LocalDate day = (LocalDate) row[0];
            BillType type = (BillType) row[1];
            BigDecimal sum = (BigDecimal) row[2];
            BigDecimal[] slot = buckets.get(monthly ? YearMonth.from(day).toString() : day.toString());
            int i = type == BillType.CASH ? 0 : 1;
            slot[i] = slot[i].add(sum);
        }

        List<DashboardResponse.TrendPoint> points = new ArrayList<>();
        buckets.forEach((bucket, v) ->
                points.add(new DashboardResponse.TrendPoint(bucket, Money.round(v[0]), Money.round(v[1]))));
        return points;
    }

    private static BigDecimal nz(BigDecimal v) {
        return v == null ? BigDecimal.ZERO : v;
    }
}