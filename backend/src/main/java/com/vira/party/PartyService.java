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
        Specification<Party> spec = Specification.allOf(
                PartySpecifications.notDeleted(), PartySpecifications.nameContains(q));
        return PageResponse.of(parties.findAll(spec, pageable).map(this::toResponse));
    }

    @Transactional(readOnly = true)
    public PartyResponse get(Long id) {
        return toResponse(find(id));
    }

    @Transactional(readOnly = true)
    public Party loadActive(Long id) {
        Party party = find(id);
        if (party.isDeleted()) {
            throw new BusinessRuleException("PARTY_INACTIVE", "This party is deleted and cannot be billed.");
        }
        return party;
    }

    Party find(Long id) {
        return parties.findById(id).orElseThrow(() -> new NotFoundException("Party " + id + " not found"));
    }

    private PartyResponse toResponse(Party p) {
        return new PartyResponse(p.getId(), p.getName(), p.getPhone(), p.getAddress(),
                p.getCity(), p.getState(), p.getRemarks(), p.getOpeningBalance(), p.getCurrentBalance());
    }
}