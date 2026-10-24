package com.vira.daybook;

import com.vira.bill.Bill;
import com.vira.bill.BillItem;

import jakarta.persistence.criteria.CriteriaBuilder;
import jakarta.persistence.criteria.CriteriaQuery;
import jakarta.persistence.criteria.Predicate;
import jakarta.persistence.criteria.Root;
import jakarta.persistence.criteria.Subquery;

import org.springframework.data.jpa.domain.Specification;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

public final class BillSpecifications {

    private BillSpecifications() {}

    public static List<Predicate> predicates(Root<Bill> root, CriteriaQuery<?> query,
                                             CriteriaBuilder cb, BillFilter f) {
        List<Predicate> list = new ArrayList<>();

        if (f.from() != null) {
            list.add(cb.greaterThanOrEqualTo(root.<LocalDate>get("billDate"), f.from()));
        }
        if (f.to() != null) {
            list.add(cb.lessThanOrEqualTo(root.<LocalDate>get("billDate"), f.to()));
        }
        if (f.billType() != null) {
            list.add(cb.equal(root.get("billType"), f.billType()));
        }
        if (f.partyId() != null) {
            list.add(cb.equal(root.get("partyId"), f.partyId()));
        }
        if (!f.includeDeleted()) {
            list.add(cb.isFalse(root.get("deleted")));
        }
        if (f.keyword() != null && !f.keyword().isBlank()) {
            String like = "%" + escape(f.keyword().trim().toLowerCase()) + "%";

            Subquery<Long> lines = query.subquery(Long.class);
            Root<BillItem> line = lines.from(BillItem.class);
            lines.select(line.<Long>get("id")).where(
                    cb.equal(line.get("bill"), root),
                    cb.like(cb.lower(line.get("itemNameSnapshot")), like, '\\'));

            list.add(cb.or(
                    cb.like(cb.lower(root.get("billNo")), like, '\\'),
                    cb.like(cb.lower(root.get("partyNameSnapshot")), like, '\\'),
                    cb.exists(lines)));
        }
        return list;
    }

    public static Specification<Bill> of(BillFilter f) {
        return (root, query, cb) -> cb.and(predicates(root, query, cb, f).toArray(new Predicate[0]));
    }

    private static String escape(String s) {
        return s.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_");
    }
}