package com.vira.bill;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

public record BillRequest(
        @NotNull BillType billType,
        Long partyId,
        @NotNull LocalDate billDate,
        @NotEmpty @Valid List<BillLineRequest> lines,
        BigDecimal roundOff) {
}
