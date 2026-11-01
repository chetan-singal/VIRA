package com.vira.supplier;

import org.springframework.data.jpa.domain.Specification;

public final class SupplierSpecifications {
    private SupplierSpecifications() {}

    public static Specification<Supplier> notDeleted() {
        return (root, query, cb) -> cb.isFalse(root.get("deleted"));
    }

    public static Specification<Supplier> deleted() {
        return (root, query, cb) -> cb.isTrue(root.get("deleted"));
    }

    /** Case-insensitive contains on name, city or phone. A blank q matches everything. */
    public static Specification<Supplier> matches(String q) {
        return (root, query, cb) -> {
            if (q == null || q.isBlank()) return null;
            String like = "%" + q.trim().toLowerCase()
                    .replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_") + "%";
            return cb.or(
                    cb.like(cb.lower(root.get("name")), like, '\\'),
                    cb.like(cb.lower(root.get("city")), like, '\\'),
                    cb.like(cb.lower(root.get("phone")), like, '\\'));
        };
    }
}