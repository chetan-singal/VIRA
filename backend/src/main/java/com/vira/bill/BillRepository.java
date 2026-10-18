package com.vira.bill;

import org.springframework.data.jpa.repository.JpaRepository;

public interface BillRepository extends JpaRepository<Bill, Long> {
    boolean existsByBillTypeAndBillNo(BillType billType, String billNo);
}