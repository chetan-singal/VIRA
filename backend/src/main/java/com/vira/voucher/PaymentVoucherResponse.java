package com.vira.voucher;

import com.vira.common.RecordActions;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

public record PaymentVoucherResponse(
        Long id, String voucherNo, Long partyId, String partyName, LocalDate paymentDate,
        BigDecimal amount, PaymentMode paymentMode, String referenceNo, String remarks,
        boolean edited, LocalDateTime lastEditedAt, boolean deleted, LocalDateTime deletedAt,
        RecordActions actions) {
}