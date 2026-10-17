package com.vira.party;

import jakarta.persistence.LockModeType;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface PartyRepository extends JpaRepository<Party, Long> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select p from Party p where p.id = :id")
    Optional<Party> lockForUpdate(@Param("id") Long id);
}