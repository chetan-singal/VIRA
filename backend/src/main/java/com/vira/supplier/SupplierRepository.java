package com.vira.supplier;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;

public interface SupplierRepository
        extends JpaRepository<Supplier, Long>, JpaSpecificationExecutor<Supplier> {

    @Query("select count(s) from Supplier s where s.deleted = false")
    long countActive();
}