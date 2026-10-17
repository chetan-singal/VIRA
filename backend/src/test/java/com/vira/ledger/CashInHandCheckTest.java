package com.vira.ledger;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
class CashInHandCheckTest {

    @Autowired private CashInHandRepository cashInHandRepository;

    @Test
    void lockForUpdate_reads_seeded_balance() {
        CashInHand row = cashInHandRepository.lockForUpdate();
        assertThat(row.getBalance()).isEqualByComparingTo("0.00");
    }
}