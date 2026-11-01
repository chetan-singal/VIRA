package com.vira.party;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
class PartySummaryServiceTest {

    @Autowired private PartySummaryService summaryService;
    @Autowired private PartyService partyService;
    @Autowired private PartyRepository partyRepository;

    @Test
    void figuresWithMixedBalances() {
        PartyListSummary before = summaryService.overall();

        partyService.create(new PartyRequest("Summary Due Party", null, null, null, null, null, new BigDecimal("500.00")));
        partyService.create(new PartyRequest("Summary Advance Party", null, null, null, null, null, new BigDecimal("-200.00")));
        partyService.create(new PartyRequest("Summary Zero Party", null, null, null, null, null, null));

        PartyListSummary after = summaryService.overall();

        assertThat(after.totalParties()).isEqualTo(before.totalParties() + 3);
        assertThat(after.partiesWithBalance()).isEqualTo(before.partiesWithBalance() + 2);
        assertThat(after.totalOutstanding().subtract(before.totalOutstanding())).isEqualByComparingTo("500.00");
        assertThat(after.totalAdvance().subtract(before.totalAdvance())).isEqualByComparingTo("200.00");
    }

    @Test
    void deletedPartyIsExcluded() {
        PartyListSummary before = summaryService.overall();

        PartyResponse party = partyService.create(
                new PartyRequest("Summary Deleted Party", null, null, null, null, null, new BigDecimal("700.00")));
        partyRepository.findById(party.id()).orElseThrow().setDeleted(true);

        PartyListSummary after = summaryService.overall();

        assertThat(after.totalParties()).isEqualTo(before.totalParties());
        assertThat(after.partiesWithBalance()).isEqualTo(before.partiesWithBalance());
        assertThat(after.totalOutstanding()).isEqualByComparingTo(before.totalOutstanding());
        assertThat(after.totalAdvance()).isEqualByComparingTo(before.totalAdvance());
    }

    @Test
    void noActivePartiesGivesZeros() {
        partyRepository.findAll().forEach(p -> p.setDeleted(true));

        PartyListSummary summary = summaryService.overall();

        assertThat(summary.totalParties()).isZero();
        assertThat(summary.partiesWithBalance()).isZero();
        assertThat(summary.totalOutstanding()).isEqualByComparingTo("0.00");
        assertThat(summary.totalAdvance()).isEqualByComparingTo("0.00");
    }
}