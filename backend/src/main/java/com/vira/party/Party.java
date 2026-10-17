package com.vira.party;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.math.BigDecimal;

/**
 * Partial entity — Phase 3 maps only id and currentBalance, for the locked
 * ledger read/update path. Phase 4 adds every remaining party column to this
 * same class; it is never split into a second class.
 *
 * Do not call PartyRepository.save() from ledger/ code — this phase only
 * reads and updates an existing row's balance.
 */
@Entity
@Table(name = "party")
public class Party {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "current_balance", nullable = false)
    private BigDecimal currentBalance;

    public Long getId() {
        return id;
    }

    public BigDecimal getCurrentBalance() {
        return currentBalance;
    }

    public void setCurrentBalance(BigDecimal currentBalance) {
        this.currentBalance = currentBalance;
    }
}