package com.vira.ledger;

import com.vira.common.NotFoundException;
import com.vira.party.Party;
import com.vira.party.PartyRepository;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;

import com.vira.common.Money;

@Service
public class LedgerService {

    private final CashInHandRepository cashRepo;
    private final PartyRepository partyRepo;

    public LedgerService(CashInHandRepository cashRepo, PartyRepository partyRepo) {
        this.cashRepo = cashRepo;
        this.partyRepo = partyRepo;
    }

    @Transactional
    public BigDecimal adjustCash(BigDecimal delta) {
        CashInHand row = cashRepo.lockForUpdate();
        BigDecimal updated = Money.round(row.getBalance().add(delta));
        row.setBalance(updated);
        row.setLastUpdatedAt(LocalDateTime.now());
        return updated;
    }

    @Transactional
    public BigDecimal adjustPartyBalance(Long partyId, BigDecimal delta) {
        Party party = partyRepo.lockForUpdate(partyId)
                .orElseThrow(() -> new NotFoundException("Party " + partyId + " not found"));
        BigDecimal updated = Money.round(party.getCurrentBalance().add(delta));
        party.setCurrentBalance(updated);
        return updated;
    }
}