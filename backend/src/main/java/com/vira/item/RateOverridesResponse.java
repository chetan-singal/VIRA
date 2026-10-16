package com.vira.item;

import java.math.BigDecimal;
import java.util.List;

public record RateOverridesResponse(CashOverride cash, List<PartyOverride> parties) {
    public record CashOverride(BigDecimal discountPercent, BigDecimal netRate) {}
    public record PartyOverride(Long partyId, BigDecimal discountPercent, BigDecimal netRate) {}
}