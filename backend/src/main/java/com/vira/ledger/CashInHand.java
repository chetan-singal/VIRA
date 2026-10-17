package com.vira.ledger;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "cash_in_hand")
public class CashInHand {

    @Id
    private Long id; // always 1

    @Column(name = "balance", nullable = false)
    private BigDecimal balance;

    @Column(name = "last_updated_at")
    private LocalDateTime lastUpdatedAt;

    protected CashInHand() {}

    public Long getId() { return id; }
    public BigDecimal getBalance() { return balance; }
    public void setBalance(BigDecimal balance) { this.balance = balance; }
    public LocalDateTime getLastUpdatedAt() { return lastUpdatedAt; }
    public void setLastUpdatedAt(LocalDateTime lastUpdatedAt) { this.lastUpdatedAt = lastUpdatedAt; }
}