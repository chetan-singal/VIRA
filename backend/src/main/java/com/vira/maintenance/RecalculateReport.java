package com.vira.maintenance;

import java.math.BigDecimal;
import java.util.List;

public record RecalculateReport(
        BigDecimal storedCash, BigDecimal expectedCash, List<PartyMismatch> partyMismatches) {

    public record PartyMismatch(Long partyId, String partyName, BigDecimal stored, BigDecimal expected) {}
}