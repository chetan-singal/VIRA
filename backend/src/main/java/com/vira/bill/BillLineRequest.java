package com.vira.bill;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;

public record BillLineRequest(
        @NotNull Long itemId,
        @NotNull @Min(1) Integer qty,
        BigDecimal mrp,
        BigDecimal discountPercent,
        BigDecimal netRate) {
}