package com.vira.bill;

import com.vira.item.ItemType;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
class BillEntityTest {

    @Autowired
    private BillRepository bills;

    @Test
    void savingABillPersistsItsLineViaCascade() {
        Bill bill = new Bill();
        bill.setBillNo("1");
        bill.setBillType(BillType.CASH);
        bill.setBillDate(LocalDate.now());
        bill.setNetAmount(new BigDecimal("900.00"));
        bill.setRoundOff(BigDecimal.ZERO);
        bill.setGrandTotal(new BigDecimal("900.00"));

        BillItem line = new BillItem();
        line.setItemNameSnapshot("Brake Pad");
        line.setItemTypeSnapshot(ItemType.MRP);
        line.setUnitSnapshot("Pcs");
        line.setMrpSnapshot(new BigDecimal("500.00"));
        line.setDiscountPercentSnapshot(new BigDecimal("10.00"));
        line.setRateSnapshot(new BigDecimal("450.00"));
        line.setQty(2);
        line.setAmount(new BigDecimal("900.00"));
        line.setLineNo(1);
        bill.addItem(line);

        Bill saved = bills.save(bill);

        Bill reloaded = bills.findById(saved.getId()).orElseThrow();
        assertThat(reloaded.getItems()).hasSize(1);
        assertThat(reloaded.getItems().get(0).getItemNameSnapshot()).isEqualTo("Brake Pad");
    }
}