package com.vira.ledger;

import com.vira.common.NotFoundException;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
class NumberSequenceServiceTest {

    @Autowired
    private NumberSequenceService sequenceService;

    @Test
    void sequentialCallsIncrementInOrder() {
        int first = sequenceService.nextValue(NumberSequenceService.CASH_BILL);
        int second = sequenceService.nextValue(NumberSequenceService.CASH_BILL);
        int third = sequenceService.nextValue(NumberSequenceService.CASH_BILL);

        assertThat(first).isEqualTo(1);
        assertThat(second).isEqualTo(2);
        assertThat(third).isEqualTo(3);
    }

    @Test
    void sequencesAreIndependent() {
        sequenceService.nextValue(NumberSequenceService.CASH_BILL);
        sequenceService.nextValue(NumberSequenceService.CASH_BILL);

        int partyBillFirst = sequenceService.nextValue(NumberSequenceService.PARTY_BILL);

        assertThat(partyBillFirst).isEqualTo(1);
    }

    @Test
    void unknownSequenceNameThrowsNotFound() {
        assertThrows(NotFoundException.class, () -> sequenceService.nextValue("NOT_A_SEQUENCE"));
    }
}