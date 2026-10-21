package com.vira.bill;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;

public interface BillRepository extends JpaRepository<Bill, Long> {
    boolean existsByBillTypeAndBillNo(BillType billType, String billNo);

    @Query("select sum(b.grandTotal) from Bill b where b.billType = :type and b.deleted = false")
    BigDecimal sumGrandTotalByTypeActive(@Param("type") BillType type);

    @Query("select sum(b.grandTotal) from Bill b " +
           "where b.partyId = :partyId and b.billType = com.vira.bill.BillType.PARTY and b.deleted = false")
    BigDecimal sumGrandTotalForPartyActive(@Param("partyId") Long partyId);
}