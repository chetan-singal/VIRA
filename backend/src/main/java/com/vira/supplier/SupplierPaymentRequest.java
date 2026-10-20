package com.vira.supplier;

import com.vira.voucher.PaymentMode;
import jakarta.validation.constraints.*;

import java.math.BigDecimal;
import java.time.LocalDate;

public record SupplierPaymentRequest(
        @NotNull Long supplierId,
        @NotNull LocalDate paymentDate,
        @NotNull @DecimalMin(value = "0.01") BigDecimal amount,
        @NotNull PaymentMode paymentMode,
        String referenceNo,
        String remarks) {
}