package com.vira.bill;

import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import jakarta.validation.ValidatorFactory;

import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.util.List;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;

class BillRequestValidationTest {

    @Test
    void emptyLinesFailsValidation() {
        try (ValidatorFactory factory = Validation.buildDefaultValidatorFactory()) {
            Validator validator = factory.getValidator();
            BillRequest request = new BillRequest(BillType.CASH, null, LocalDate.now(), List.of(), null);

            Set<ConstraintViolation<BillRequest>> violations = validator.validate(request);

            assertThat(violations).isNotEmpty();
        }
    }
}