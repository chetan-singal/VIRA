package com.vira.ledger;

import com.vira.support.TestData;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
class LedgerServiceTest {

    @Autowired
    private LedgerService ledgerService;

    @Autowired
    private JdbcTemplate jdbc;

    @Test
    void adjustCashAppliesSequentialDeltas() {
        ledgerService.adjustCash(new BigDecimal("100"));
        BigDecimal result = ledgerService.adjustCash(new BigDecimal("-30"));

        assertThat(result).isEqualByComparingTo("70.00");
    }

    @Test
    void adjustPartyBalanceDoesNotCrossContaminateParties() {
        Long partyId1 = TestData.insertParty(jdbc, "Party One");
        Long partyId2 = TestData.insertParty(jdbc, "Party Two");

        BigDecimal result1 = ledgerService.adjustPartyBalance(partyId1, new BigDecimal("50"));
        BigDecimal result2 = ledgerService.adjustPartyBalance(partyId2, new BigDecimal("20"));

        assertThat(result1).isEqualByComparingTo("50.00");
        assertThat(result2).isEqualByComparingTo("20.00");
    }
}