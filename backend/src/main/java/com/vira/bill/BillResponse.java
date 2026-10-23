package com.vira.bill;

import com.vira.common.RecordActions;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

public record BillResponse(
        Long id, String billNo, BillType billType,
        Long partyId, String partyName,
        LocalDate billDate, List<BillLineResponse> lines,
        BigDecimal netAmount, BigDecimal roundOff, BigDecimal grandTotal,
        BigDecimal previousBalance, BigDecimal totalDue,
        boolean edited, LocalDateTime lastEditedAt,
        boolean deleted, LocalDateTime deletedAt,
        RecordActions actions) {
}