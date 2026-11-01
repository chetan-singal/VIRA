package com.vira.supplier;

import com.vira.common.Money;
import com.vira.common.NotFoundException;
import com.vira.ledger.CashInHandRepository;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;

@Service
public class SupplierSummaryService {

    private final SupplierRepository suppliers;
    private final SupplierPaymentRepository payments;
    private final CashInHandRepository cashInHand;

    public SupplierSummaryService(SupplierRepository suppliers, SupplierPaymentRepository payments,
                                  CashInHandRepository cashInHand) {
        this.suppliers = suppliers;
        this.payments = payments;
        this.cashInHand = cashInHand;
    }

    /** Figures for the Suppliers list tiles: active suppliers and active payments, plus the stored Cash in Hand. */
    @Transactional(readOnly = true)
    public SupplierListSummary overall() {
        BigDecimal cash = cashInHand.findById(1L)
                .orElseThrow(() -> new NotFoundException("Cash in Hand row is missing"))
                .getBalance();
        return new SupplierListSummary(
                suppliers.countActive(),
                payments.countAllActive(),
                Money.round(nz(payments.sumAllActive())),
                cash);
    }

    /** Active payments of one supplier. A deleted supplier still answers; an unknown id is a 404. */
    @Transactional(readOnly = true)
    public SupplierPaymentTotals forSupplier(Long supplierId) {
        if (!suppliers.existsById(supplierId)) {
            throw new NotFoundException("Supplier " + supplierId + " not found");
        }
        return new SupplierPaymentTotals(
                payments.countActiveBySupplier(supplierId),
                Money.round(nz(payments.sumActiveBySupplier(supplierId))));
    }

    private static BigDecimal nz(BigDecimal v) {
        return v == null ? BigDecimal.ZERO : v;
    }
}