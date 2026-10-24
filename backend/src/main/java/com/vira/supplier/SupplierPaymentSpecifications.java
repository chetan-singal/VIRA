package com.vira.supplier;

import jakarta.persistence.criteria.Predicate;

import org.springframework.data.jpa.domain.Specification;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

public final class SupplierPaymentSpecifications {

    private SupplierPaymentSpecifications() {}

    public static Specification<SupplierPayment> of(LocalDate from, LocalDate to, Long supplierId,
                                                    String keyword, boolean includeDeleted) {
        return (root, query, cb) -> {
            List<Predicate> list = new ArrayList<>();

            if (from != null) {
                list.add(cb.greaterThanOrEqualTo(root.<LocalDate>get("paymentDate"), from));
            }
            if (to != null) {
                list.add(cb.lessThanOrEqualTo(root.<LocalDate>get("paymentDate"), to));
            }
            if (supplierId != null) {
                list.add(cb.equal(root.get("supplierId"), supplierId));
            }
            if (!includeDeleted) {
                list.add(cb.isFalse(root.get("deleted")));
            }
            if (keyword != null && !keyword.isBlank()) {
                String like = "%" + keyword.trim().toLowerCase()
                        .replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_") + "%";
                list.add(cb.or(
                        cb.like(cb.lower(root.get("paymentNo")), like, '\\'),
                        cb.like(cb.lower(root.get("supplierNameSnapshot")), like, '\\'),
                        cb.like(cb.lower(root.get("referenceNo")), like, '\\')));
            }
            return cb.and(list.toArray(new Predicate[0]));
        };
    }
}