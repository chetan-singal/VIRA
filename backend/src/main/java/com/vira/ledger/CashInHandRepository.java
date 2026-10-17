package com.vira.ledger;

import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;

public interface CashInHandRepository extends JpaRepository<CashInHand, Long> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select c from CashInHand c where c.id = 1")
    CashInHand lockForUpdate();
}