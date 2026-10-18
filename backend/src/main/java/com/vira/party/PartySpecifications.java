package com.vira.party;

import org.springframework.data.jpa.domain.Specification;

public final class PartySpecifications {
    private PartySpecifications() {}

    public static Specification<Party> notDeleted() {
        return (root, query, cb) -> cb.isFalse(root.get("deleted"));
    }

    public static Specification<Party> nameContains(String q) {
        return (root, query, cb) -> {
            if (q == null || q.isBlank()) return null;
            String like = "%" + q.trim().toLowerCase()
                    .replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_") + "%";
            return cb.like(cb.lower(root.get("name")), like, '\\');
        };
    }
}