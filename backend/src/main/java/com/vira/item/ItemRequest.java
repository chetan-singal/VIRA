package com.vira.item;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.util.Set;

public record ItemRequest(
        @NotBlank @Size(max = 150) String name,
        @NotBlank String unit,
        Long partCategoryId,
        Set<Long> bikeIds,
        @NotNull ItemType itemType,
        BigDecimal mrp,
        BigDecimal defaultDiscountPercent,
        BigDecimal defaultNetRate) {}