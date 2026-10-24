package com.vira.supplier;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;

import java.math.BigDecimal;

public interface SupplierPaymentRepository
        extends JpaRepository<SupplierPayment, Long>, JpaSpecificationExecutor<SupplierPayment> {

    @Query("select sum(p.amount) from SupplierPayment p where p.deleted = false")
    BigDecimal sumAllActive();
}