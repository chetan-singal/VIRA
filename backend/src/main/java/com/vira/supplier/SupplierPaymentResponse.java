package com.vira.supplier;

import com.vira.voucher.PaymentMode;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

public record SupplierPaymentResponse(
        Long id, String paymentNo, Long supplierId, String supplierName, LocalDate paymentDate,
        BigDecimal amount, PaymentMode paymentMode, String referenceNo, String remarks,
        boolean edited, LocalDateTime lastEditedAt, boolean deleted, LocalDateTime deletedAt) {
}