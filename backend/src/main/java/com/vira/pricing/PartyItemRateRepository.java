package com.vira.pricing;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface PartyItemRateRepository extends JpaRepository<PartyItemRate, Long> {
    Optional<PartyItemRate> findByPartyIdAndItemId(Long partyId, Long itemId);
    List<PartyItemRate> findByItemId(Long itemId);
    boolean existsByItemId(Long itemId);

    @Modifying(clearAutomatically = true)
    @Query("delete from PartyItemRate r where r.itemId = :itemId")
    int deleteAllByItemId(@Param("itemId") Long itemId);
}