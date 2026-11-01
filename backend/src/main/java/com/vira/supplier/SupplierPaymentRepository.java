package com.vira.supplier;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;

public interface SupplierPaymentRepository
        extends JpaRepository<SupplierPayment, Long>, JpaSpecificationExecutor<SupplierPayment> {

    @Query("select sum(p.amount) from SupplierPayment p where p.deleted = false")
    BigDecimal sumAllActive();

    @Query("select count(p) from SupplierPayment p where p.deleted = false")
    long countAllActive();

    @Query("select sum(p.amount) from SupplierPayment p where p.deleted = false and p.supplierId = :supplierId")
    BigDecimal sumActiveBySupplier(@Param("supplierId") Long supplierId);

    @Query("select count(p) from SupplierPayment p where p.deleted = false and p.supplierId = :supplierId")
    long countActiveBySupplier(@Param("supplierId") Long supplierId);
}