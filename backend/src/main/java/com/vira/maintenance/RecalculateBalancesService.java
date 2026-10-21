package com.vira.maintenance;

import com.vira.bill.BillRepository;
import com.vira.bill.BillType;
import com.vira.common.NotFoundException;
import com.vira.ledger.CashInHandRepository;
import com.vira.ledger.LedgerService;
import com.vira.party.Party;
import com.vira.party.PartyRepository;
import com.vira.supplier.SupplierPaymentRepository;
import com.vira.voucher.PaymentVoucherRepository;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

@Service
public class RecalculateBalancesService {

    private final CashInHandRepository cashInHand;
    private final PartyRepository parties;
    private final BillRepository bills;
    private final PaymentVoucherRepository vouchers;
    private final SupplierPaymentRepository supplierPayments;
    private final LedgerService ledger;

    public RecalculateBalancesService(CashInHandRepository cashInHand, PartyRepository parties,
            BillRepository bills, PaymentVoucherRepository vouchers,
            SupplierPaymentRepository supplierPayments, LedgerService ledger) {
        this.cashInHand = cashInHand;
        this.parties = parties;
        this.bills = bills;
        this.vouchers = vouchers;
        this.supplierPayments = supplierPayments;
        this.ledger = ledger;
    }

    @Transactional(readOnly = true)
    public RecalculateReport check() {
        BigDecimal storedCash = cashInHand.findById(1L)
                .orElseThrow(() -> new NotFoundException("Cash in Hand row not found")).getBalance();

        List<RecalculateReport.PartyMismatch> mismatches = new ArrayList<>();
        for (Party p : parties.findAll()) {
            BigDecimal expected = expectedPartyBalance(p);
            if (expected.compareTo(p.getCurrentBalance()) != 0) {
                mismatches.add(new RecalculateReport.PartyMismatch(
                        p.getId(), p.getName(), p.getCurrentBalance(), expected));
            }
        }
        return new RecalculateReport(storedCash, expectedCash(), mismatches);
    }

    @Transactional
    public RecalculateReport applyCashCorrection() {
        BigDecimal current = cashInHand.lockForUpdate().getBalance();
        BigDecimal delta = expectedCash().subtract(current);
        if (delta.signum() != 0) {
            ledger.adjustCash(delta);
        }
        return check();
    }

    @Transactional
    public RecalculateReport applyPartyCorrection(Long partyId) {
        Party party = parties.lockForUpdate(partyId)
                .orElseThrow(() -> new NotFoundException("Party " + partyId + " not found"));
        BigDecimal delta = expectedPartyBalance(party).subtract(party.getCurrentBalance());
        if (delta.signum() != 0) {
            ledger.adjustPartyBalance(partyId, delta);
        }
        return check();
    }

    // opening cash is zero until ShopProfile exists (Phase 6/8) — revisit then
    private BigDecimal expectedCash() {
        BigDecimal openingCash = BigDecimal.ZERO;
        return openingCash
                .add(nz(bills.sumGrandTotalByTypeActive(BillType.CASH)))
                .add(nz(vouchers.sumAllActive()))
                .subtract(nz(supplierPayments.sumAllActive()));
    }

    private BigDecimal expectedPartyBalance(Party p) {
        return p.getOpeningBalance()
                .add(nz(bills.sumGrandTotalForPartyActive(p.getId())))
                .subtract(nz(vouchers.sumByPartyActive(p.getId())));
    }

    private static BigDecimal nz(BigDecimal v) {
        return v == null ? BigDecimal.ZERO : v;
    }
}