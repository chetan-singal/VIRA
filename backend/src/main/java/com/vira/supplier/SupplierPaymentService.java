package com.vira.supplier;

import com.vira.common.Money;
import com.vira.common.NotFoundException;
import com.vira.ledger.LedgerService;
import com.vira.ledger.NumberSequenceService;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class SupplierPaymentService {

    private final SupplierPaymentRepository payments;
    private final SupplierService supplierService;
    private final LedgerService ledger;
    private final NumberSequenceService numbers;

    public SupplierPaymentService(SupplierPaymentRepository payments, SupplierService supplierService,
                                   LedgerService ledger, NumberSequenceService numbers) {
        this.payments = payments;
        this.supplierService = supplierService;
        this.ledger = ledger;
        this.numbers = numbers;
    }

    @Transactional
    public SupplierPaymentResponse create(SupplierPaymentRequest r) {
        Supplier supplier = supplierService.loadActive(r.supplierId());

        SupplierPayment p = new SupplierPayment();
        p.setSupplierId(supplier.getId());
        p.setSupplierNameSnapshot(supplier.getName());
        p.setPaymentDate(r.paymentDate());
        p.setAmount(Money.round(r.amount()));
        p.setPaymentMode(r.paymentMode());
        p.setReferenceNo(r.referenceNo());
        p.setRemarks(r.remarks());
        p.setPaymentNo(String.valueOf(numbers.nextValue(NumberSequenceService.SUPPLIER_PAYMENT)));

        SupplierPayment saved = payments.save(p);

        ledger.adjustCash(p.getAmount().negate());

        return toResponse(saved);
    }

    SupplierPayment find(Long id) {
        return payments.findById(id).orElseThrow(() -> new NotFoundException("Supplier Payment " + id + " not found"));
    }

    private SupplierPaymentResponse toResponse(SupplierPayment p) {
        return new SupplierPaymentResponse(p.getId(), p.getPaymentNo(), p.getSupplierId(), p.getSupplierNameSnapshot(),
                p.getPaymentDate(), p.getAmount(), p.getPaymentMode(), p.getReferenceNo(), p.getRemarks(),
                p.isEdited(), p.getLastEditedAt(), p.isDeleted(), p.getDeletedAt());
    }
}