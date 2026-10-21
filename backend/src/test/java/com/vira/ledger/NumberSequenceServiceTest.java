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
        int first = sequenceService.nextValue(NumberSequenceService.BILL);
        int second = sequenceService.nextValue(NumberSequenceService.BILL);
        int third = sequenceService.nextValue(NumberSequenceService.BILL);

        assertThat(first).isEqualTo(1);
        assertThat(second).isEqualTo(2);
        assertThat(third).isEqualTo(3);
    }

    @Test
    void sequencesAreIndependent() {
        int before = sequenceService.nextValue(NumberSequenceService.SUPPLIER_PAYMENT);

        sequenceService.nextValue(NumberSequenceService.BILL);
        sequenceService.nextValue(NumberSequenceService.BILL);

        int after = sequenceService.nextValue(NumberSequenceService.SUPPLIER_PAYMENT);

        assertThat(after).isEqualTo(before + 1);
    }

    @Test
    void unknownSequenceNameThrowsNotFound() {
        assertThrows(NotFoundException.class, () -> sequenceService.nextValue("NOT_A_SEQUENCE"));
    }
}