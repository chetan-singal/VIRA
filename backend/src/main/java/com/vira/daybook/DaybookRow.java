package com.vira.daybook;

import com.vira.bill.BillType;
import com.vira.common.RecordActions;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

public record DaybookRow(
        Long id, String billNo, LocalDate billDate, BillType billType,
        Long partyId, String partyName, BigDecimal grandTotal,
        boolean edited, LocalDateTime lastEditedAt, boolean deleted, LocalDateTime deletedAt,
        RecordActions actions) {
}