package com.vira.item;

import org.springframework.data.jpa.domain.Specification;

public final class ItemSpecifications {
    private ItemSpecifications() {}

    public static Specification<Item> nameContains(String q) {
        return (root, query, cb) -> {
            if (q == null || q.isBlank()) return null;
            String like = "%" + q.trim().toLowerCase()
                    .replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_") + "%";
            return cb.like(cb.lower(root.get("name")), like, '\\');
        };
    }

    public static Specification<Item> hasType(ItemType t) {
        return (root, query, cb) -> t == null ? null : cb.equal(root.get("itemType"), t);
    }

    public static Specification<Item> inCategory(Long id) {
        return (root, query, cb) -> id == null ? null : cb.equal(root.get("partCategory").get("id"), id);
    }

    public static Specification<Item> compatibleWithBike(Long bikeId) {
        return (root, query, cb) -> {
            if (bikeId == null) return null;
            return cb.equal(root.join("bikes").get("id"), bikeId);
        };
    }
}