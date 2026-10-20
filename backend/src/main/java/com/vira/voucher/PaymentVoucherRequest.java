package com.vira.voucher;

import jakarta.validation.constraints.*;

import java.math.BigDecimal;
import java.time.LocalDate;

public record PaymentVoucherRequest(
        @NotNull Long partyId,
        @NotNull LocalDate paymentDate,
        @NotNull @DecimalMin(value = "0.01") BigDecimal amount,
        @NotNull PaymentMode paymentMode,
        String referenceNo,
        String remarks) {
}