// PermanentPriceChange.java
package com.vira.pricing;

import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;

public record PermanentPriceChange(
        @NotNull Long itemId,
        @NotNull CustomerKind customer,
        Long partyId,
        @NotNull PricedField field,
        @NotNull BigDecimal newValue) {}