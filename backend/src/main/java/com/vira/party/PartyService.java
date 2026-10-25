package com.vira.party;

import com.vira.common.BusinessRuleException;
import com.vira.common.Money;
import com.vira.common.NotFoundException;
import com.vira.common.PageResponse;

import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Collection;
import java.util.HashMap;
import java.util.Map;
import java.util.Objects;

@Service
public class PartyService {

    private final PartyRepository parties;

    public PartyService(PartyRepository parties) {
        this.parties = parties;
    }

    @Transactional
    public PartyResponse create(PartyRequest r) {
        Party party = new Party();
        party.setName(r.name().trim());
        party.setPhone(r.phone());
        party.setAddress(r.address());
        party.setCity(r.city());
        party.setState(r.state());
        party.setRemarks(r.remarks());
        BigDecimal opening = r.openingBalance() == null ? BigDecimal.ZERO : Money.round(r.openingBalance());
        party.setOpeningBalance(opening);
        party.setCurrentBalance(opening);
        return toResponse(parties.save(party));
    }

    @Transactional(readOnly = true)
    public PageResponse<PartyResponse> list(String q, Pageable pageable) {
        return list(q, false, pageable);
    }

    @Transactional(readOnly = true)
    public PageResponse<PartyResponse> list(String q, boolean deletedOnly, Pageable pageable) {
        Specification<Party> spec = Specification.allOf(
                deletedOnly ? PartySpecifications.deleted() : PartySpecifications.notDeleted(),
                PartySpecifications.nameContains(q));
        return PageResponse.of(parties.findAll(spec, pageable).map(this::toResponse));
    }

    @Transactional(readOnly = true)
    public PartyResponse get(Long id) {
        return toResponse(find(id));
    }

    @Transactional
    public PartyResponse update(Long id, PartyUpdateRequest r) {
        Party party = find(id);
        if (party.isDeleted()) {
            throw new BusinessRuleException("PARTY_DELETED", "This party is deleted. Restore it first.");
        }
        party.setName(r.name().trim());
        party.setPhone(r.phone());
        party.setAddress(r.address());
        party.setCity(r.city());
        party.setState(r.state());
        party.setRemarks(r.remarks());
        return toResponse(party);
    }
    @Transactional(readOnly = true)
    public Party loadActive(Long id) {
        Party party = find(id);
        if (party.isDeleted()) {
            throw new BusinessRuleException("PARTY_INACTIVE", "This party is deleted and cannot be billed.");
        }
        return party;
    }

    @Transactional
    public void delete(Long id) {
        Party party = find(id);
        if (party.isDeleted()) {
            throw new BusinessRuleException("PARTY_ALREADY_DELETED", "This party is already deleted.");
        }
        if (party.getCurrentBalance().compareTo(BigDecimal.ZERO) != 0) {
            throw new BusinessRuleException("PARTY_BALANCE_NOT_ZERO",
                    "This party's balance must be exactly zero before it can be deleted.");
        }
        party.setDeleted(true);
        party.setDeletedAt(LocalDateTime.now());
    }

    @Transactional
    public void restore(Long id) {
        Party party = find(id);
        if (!party.isDeleted()) {
            throw new BusinessRuleException("PARTY_NOT_DELETED", "This party is not deleted.");
        }
        party.setDeleted(false);
        party.setDeletedAt(null);
    }

    @Transactional(readOnly = true)
    public Party loadAny(Long id) {
        return find(id);
    }

    /** Party id -> deleted flag, for a batch of ids. Null ids are ignored. */
    @Transactional(readOnly = true)
    public Map<Long, Boolean> deletedFlags(Collection<Long> ids) {
        Map<Long, Boolean> result = new HashMap<>();
        for (Party p : parties.findAllById(ids.stream().filter(Objects::nonNull).toList())) {
            result.put(p.getId(), p.isDeleted());
        }
        return result;
    }

    Party find(Long id) {
        return parties.findById(id).orElseThrow(() -> new NotFoundException("Party " + id + " not found"));
    }

    private PartyResponse toResponse(Party p) {
        return new PartyResponse(p.getId(), p.getName(), p.getPhone(), p.getAddress(),
                p.getCity(), p.getState(), p.getRemarks(), p.getOpeningBalance(), p.getCurrentBalance(),
                p.isDeleted(), p.getDeletedAt());
    }
}