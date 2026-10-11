package com.vira.pricing;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface CashItemRateRepository extends JpaRepository<CashItemRate, Long> {
    Optional<CashItemRate> findByItemId(Long itemId);
    boolean existsByItemId(Long itemId);

    @Modifying(clearAutomatically = true)
    @Query("delete from CashItemRate r where r.itemId = :itemId")
    int deleteAllByItemId(@Param("itemId") Long itemId);
}