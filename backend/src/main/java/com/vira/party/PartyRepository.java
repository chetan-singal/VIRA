package com.vira.party;

import jakarta.persistence.LockModeType;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.util.Optional;

public interface PartyRepository
        extends JpaRepository<Party, Long>, JpaSpecificationExecutor<Party> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select p from Party p where p.id = :id")
    Optional<Party> lockForUpdate(@Param("id") Long id);

    @Query("select count(p) from Party p where p.deleted = false")
    long countActive();

    @Query("select count(p) from Party p where p.deleted = false and p.currentBalance <> 0")
    long countActiveWithBalance();

    @Query("select sum(p.currentBalance) from Party p where p.deleted = false and p.currentBalance > 0")
    BigDecimal sumActiveOutstanding();

    @Query("select sum(p.currentBalance) from Party p where p.deleted = false and p.currentBalance < 0")
    BigDecimal sumActiveAdvance();
}