package com.vira.bill;

import org.springframework.data.jpa.repository.JpaRepository;

public interface BillRepository extends JpaRepository<Bill, Long> {
    boolean existsByBillNo(String billNo);
}