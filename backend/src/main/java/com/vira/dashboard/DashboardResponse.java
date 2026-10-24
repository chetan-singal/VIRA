package com.vira.dashboard;

import com.vira.daybook.DaybookRow;
import com.vira.supplier.SupplierPaymentResponse;
import com.vira.voucher.PaymentVoucherResponse;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

public record DashboardResponse(
        DashboardPeriod period, LocalDate from, LocalDate to,
        Kpis kpis, String trendGranularity, List<TrendPoint> salesTrend,
        List<DaybookRow> recentBills,
        List<PaymentVoucherResponse> recentPayments,
        List<SupplierPaymentResponse> recentSupplierPayments) {

    public record Kpis(BigDecimal totalSales, BigDecimal cashBillSales, BigDecimal partySales,
                       BigDecimal paymentsReceivedFromParties, BigDecimal cashInHand,
                       boolean cashInHandNegative) {
    }

    public record TrendPoint(String bucket, BigDecimal cashBillSales, BigDecimal partySales) {
    }
}