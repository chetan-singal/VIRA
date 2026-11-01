package com.vira.party;

import org.springframework.data.jpa.domain.Specification;

public final class PartySpecifications {
    private PartySpecifications() {}

    public static Specification<Party> notDeleted() {
        return (root, query, cb) -> cb.isFalse(root.get("deleted"));
    }

    public static Specification<Party> deleted() {
        return (root, query, cb) -> cb.isTrue(root.get("deleted"));
    }

    /** Case-insensitive contains on name, city or phone. A blank q matches everything. */
    public static Specification<Party> matches(String q) {
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