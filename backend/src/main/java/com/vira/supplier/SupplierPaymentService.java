package com.vira.supplier;

import com.vira.common.BusinessRuleException;
import com.vira.common.Money;
import com.vira.common.NotFoundException;
import com.vira.common.PageResponse;
import com.vira.common.RecordActions;
import com.vira.ledger.LedgerService;
import com.vira.ledger.NumberSequenceService;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Map;
import java.util.stream.Collectors;

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

    @Transactional
    public SupplierPaymentResponse edit(Long id, SupplierPaymentRequest r) {
        SupplierPayment p = find(id);
        if (p.isDeleted()) {
            throw new BusinessRuleException("PAYMENT_DELETED", "This payment is deleted. Restore it first.");
        }
        supplierService.loadActive(p.getSupplierId());

        ledger.adjustCash(p.getAmount());

        Supplier newSupplier = supplierService.loadActive(r.supplierId());
        p.setSupplierId(newSupplier.getId());
        p.setSupplierNameSnapshot(newSupplier.getName());
        p.setPaymentDate(r.paymentDate());
        p.setAmount(Money.round(r.amount()));
        p.setPaymentMode(r.paymentMode());
        p.setReferenceNo(r.referenceNo());
        p.setRemarks(r.remarks());
        p.setEdited(true);
        p.setLastEditedAt(LocalDateTime.now());

        SupplierPayment saved = payments.save(p);

        ledger.adjustCash(p.getAmount().negate());

        return toResponse(saved);
    }

    @Transactional
    public void delete(Long id) {
        SupplierPayment p = find(id);
        if (p.isDeleted()) {
            throw new BusinessRuleException("PAYMENT_ALREADY_DELETED", "This payment is already deleted.");
        }
        supplierService.loadActive(p.getSupplierId());
        ledger.adjustCash(p.getAmount());
        p.setDeleted(true);
        p.setDeletedAt(LocalDateTime.now());
    }

    @Transactional
    public SupplierPaymentResponse restore(Long id) {
        SupplierPayment p = find(id);
        if (!p.isDeleted()) {
            throw new BusinessRuleException("PAYMENT_NOT_DELETED", "This payment is not deleted.");
        }
        if (supplierService.loadAny(p.getSupplierId()).isDeleted()) {
            throw new BusinessRuleException("RESTORE_BLOCKED_SUPPLIER_DELETED",
                    "This payment's supplier is deleted. Restore the supplier first.");
        }
        ledger.adjustCash(p.getAmount().negate());
        p.setDeleted(false);
        p.setDeletedAt(null);
        return toResponse(p);
    }

    @Transactional(readOnly = true)
    public SupplierPaymentResponse get(Long id) {
        SupplierPayment p = find(id);
        return toResponse(p, supplierService.loadAny(p.getSupplierId()).isDeleted());
    }

    @Transactional(readOnly = true)
    public PageResponse<SupplierPaymentResponse> list(LocalDate from, LocalDate to, Long supplierId,
                                                      String keyword, boolean includeDeleted,
                                                      Pageable pageable) {
        Page<SupplierPayment> page = payments.findAll(
                SupplierPaymentSpecifications.of(from, to, supplierId, keyword, includeDeleted), pageable);
        Map<Long, Boolean> deleted = supplierService.deletedFlags(
                page.getContent().stream().map(SupplierPayment::getSupplierId).collect(Collectors.toSet()));
        return PageResponse.of(page.map(p -> toResponse(p, deleted.getOrDefault(p.getSupplierId(), false))));
    }

    SupplierPayment find(Long id) {
        return payments.findById(id).orElseThrow(() -> new NotFoundException("Supplier Payment " + id + " not found"));
    }

    private SupplierPaymentResponse toResponse(SupplierPayment p) {
        return toResponse(p, false);
    }

    private SupplierPaymentResponse toResponse(SupplierPayment p, boolean supplierDeleted) {
        return new SupplierPaymentResponse(p.getId(), p.getPaymentNo(), p.getSupplierId(), p.getSupplierNameSnapshot(),
                p.getPaymentDate(), p.getAmount(), p.getPaymentMode(), p.getReferenceNo(), p.getRemarks(),
                p.isEdited(), p.getLastEditedAt(), p.isDeleted(), p.getDeletedAt(),
                RecordActions.of(p.isDeleted(), supplierDeleted, "supplier"));
    }
}