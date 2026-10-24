package com.vira.daybook;

import com.vira.bill.BillType;

import java.time.LocalDate;

public record BillFilter(LocalDate from, LocalDate to, BillType billType,
                         Long partyId, String keyword, boolean includeDeleted) {

    /** Same filters with deleted bills forced out — what the summary uses. */
    public BillFilter activeOnly() {
        return new BillFilter(from, to, billType, partyId, keyword, false);
    }
}