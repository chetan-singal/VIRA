package com.vira.daybook;

import com.vira.bill.Bill;
import com.vira.bill.BillRepository;
import com.vira.bill.BillType;
import com.vira.common.FieldValidationException;
import com.vira.common.Money;
import com.vira.common.PageResponse;
import com.vira.common.RecordActions;
import com.vira.party.PartyService;

import jakarta.persistence.EntityManager;
import jakarta.persistence.criteria.CriteriaBuilder;
import jakarta.persistence.criteria.CriteriaQuery;
import jakarta.persistence.criteria.Predicate;
import jakarta.persistence.criteria.Root;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class DaybookService {

    private final BillRepository bills;
    private final PartyService partyService;
    private final EntityManager em;

    public DaybookService(BillRepository bills, PartyService partyService, EntityManager em) {
        this.bills = bills;
        this.partyService = partyService;
        this.em = em;
    }

    @Transactional(readOnly = true)
    public DaybookResponse query(BillFilter filter, Pageable pageable) {
        if (filter.from() != null && filter.to() != null && filter.from().isAfter(filter.to())) {
            throw new FieldValidationException("to", "Must not be before the From date");
        }

        Page<Bill> page = bills.findAll(BillSpecifications.of(filter), pageable);
        Map<Long, Boolean> partyDeleted = partyService.deletedFlags(
                page.getContent().stream().map(Bill::getPartyId).collect(Collectors.toSet()));

        Page<DaybookRow> rows = page.map(b -> toRow(b, partyDeleted));
        return new DaybookResponse(summarise(filter), PageResponse.of(rows));
    }

    /** Latest bills overall, deleted ones included — the Dashboard's Recent Bills. */
    @Transactional(readOnly = true)
    public List<DaybookRow> recent(int limit) {
        Page<Bill> page = bills.findAll(
                PageRequest.of(0, limit, Sort.by(Sort.Direction.DESC, "billDate", "id")));
        Map<Long, Boolean> partyDeleted = partyService.deletedFlags(
                page.getContent().stream().map(Bill::getPartyId).collect(Collectors.toSet()));
        return page.getContent().stream().map(b -> toRow(b, partyDeleted)).toList();
    }

    private DaybookSummary summarise(BillFilter filter) {
        CriteriaBuilder cb = em.getCriteriaBuilder();
        CriteriaQuery<Object[]> q = cb.createQuery(Object[].class);
        Root<Bill> root = q.from(Bill.class);

        q.multiselect(root.get("billType"), cb.count(root), cb.sum(root.<BigDecimal>get("grandTotal")));
        q.where(BillSpecifications.predicates(root, q, cb, filter.activeOnly()).toArray(new Predicate[0]));
        q.groupBy(root.get("billType"));

        long count = 0;
        BigDecimal cash = BigDecimal.ZERO;
        BigDecimal party = BigDecimal.ZERO;
        for (Object[] row : em.createQuery(q).getResultList()) {
            BillType type = (BillType) row[0];
            long n = (Long) row[1];
            BigDecimal sum = row[2] == null ? BigDecimal.ZERO : (BigDecimal) row[2];
            count += n;
            if (type == BillType.CASH) {
                cash = sum;
            } else {
                party = sum;
            }
        }
        return new DaybookSummary(count, Money.round(cash.add(party)), Money.round(cash), Money.round(party));
    }

    private DaybookRow toRow(Bill b, Map<Long, Boolean> partyDeleted) {
        boolean linkedDeleted = b.getPartyId() != null && partyDeleted.getOrDefault(b.getPartyId(), false);
        return new DaybookRow(b.getId(), b.getBillNo(), b.getBillDate(), b.getBillType(),
                b.getPartyId(), b.getPartyNameSnapshot(), b.getGrandTotal(),
                b.isEdited(), b.getLastEditedAt(), b.isDeleted(), b.getDeletedAt(),
                RecordActions.of(b.isDeleted(), linkedDeleted, "party"));
    }
}