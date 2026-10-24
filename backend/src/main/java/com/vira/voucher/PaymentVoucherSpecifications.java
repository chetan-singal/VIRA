package com.vira.voucher;

import jakarta.persistence.criteria.Predicate;

import org.springframework.data.jpa.domain.Specification;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

public final class PaymentVoucherSpecifications {

    private PaymentVoucherSpecifications() {}

    public static Specification<PaymentVoucher> of(LocalDate from, LocalDate to, Long partyId,
                                                   String keyword, boolean includeDeleted) {
        return (root, query, cb) -> {
            List<Predicate> list = new ArrayList<>();

            if (from != null) {
                list.add(cb.greaterThanOrEqualTo(root.<LocalDate>get("paymentDate"), from));
            }
            if (to != null) {
                list.add(cb.lessThanOrEqualTo(root.<LocalDate>get("paymentDate"), to));
            }
            if (partyId != null) {
                list.add(cb.equal(root.get("partyId"), partyId));
            }
            if (!includeDeleted) {
                list.add(cb.isFalse(root.get("deleted")));
            }
            if (keyword != null && !keyword.isBlank()) {
                String like = "%" + keyword.trim().toLowerCase()
                        .replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_") + "%";
                list.add(cb.or(
                        cb.like(cb.lower(root.get("voucherNo")), like, '\\'),
                        cb.like(cb.lower(root.get("partyNameSnapshot")), like, '\\'),
                        cb.like(cb.lower(root.get("referenceNo")), like, '\\')));
            }
            return cb.and(list.toArray(new Predicate[0]));
        };
    }
}