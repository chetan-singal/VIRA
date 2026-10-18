package com.vira.party;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.data.domain.PageRequest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
class PartyServiceTest {

    @Autowired
    private PartyService partyService;

    @Test
    void createWithOpeningBalanceSeedsCurrentBalanceImmediately() {
        PartyResponse response = partyService.create(
                new PartyRequest("Ramesh Motors", null, null, null, null, null, new BigDecimal("500.00")));

        assertThat(response.currentBalance()).isEqualByComparingTo("500.00");
        assertThat(response.openingBalance()).isEqualByComparingTo("500.00");
    }

    @Test
    void createWithNoOpeningBalanceDefaultsToZero() {
        PartyResponse response = partyService.create(
                new PartyRequest("Suresh Spares", null, null, null, null, null, null));

        assertThat(response.openingBalance()).isEqualByComparingTo("0.00");
        assertThat(response.currentBalance()).isEqualByComparingTo("0.00");
    }

    @Test
    void listSearchesByPartialCaseInsensitiveName() {
        partyService.create(new PartyRequest("Krishna Auto Parts", null, null, null, null, null, null));
        partyService.create(new PartyRequest("Unrelated Traders", null, null, null, null, null, null));

        var page = partyService.list("krishna", PageRequest.of(0, 10));

        assertThat(page.content()).hasSize(1);
        assertThat(page.content().get(0).name()).isEqualTo("Krishna Auto Parts");
    }
}