package com.vira.voucher;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.time.LocalDate;

public interface PaymentVoucherRepository
        extends JpaRepository<PaymentVoucher, Long>, JpaSpecificationExecutor<PaymentVoucher> {

    @Query("select sum(v.amount) from PaymentVoucher v where v.deleted = false")
    BigDecimal sumAllActive();

    @Query("select sum(v.amount) from PaymentVoucher v where v.partyId = :partyId and v.deleted = false")
    BigDecimal sumByPartyActive(@Param("partyId") Long partyId);

    @Query("select sum(v.amount) from PaymentVoucher v "
            + "where v.deleted = false and v.paymentDate between :from and :to")
    BigDecimal sumActiveBetween(@Param("from") LocalDate from, @Param("to") LocalDate to);
}