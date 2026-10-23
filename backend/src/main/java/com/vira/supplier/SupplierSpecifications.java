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

    public static Specification<Supplier> nameContains(String q) {
        return (root, query, cb) -> {
            if (q == null || q.isBlank()) return null;
            String like = "%" + q.trim().toLowerCase()
                    .replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_") + "%";
            return cb.like(cb.lower(root.get("name")), like, '\\');
        };
    }
}