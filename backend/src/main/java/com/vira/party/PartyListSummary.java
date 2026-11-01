package com.vira.party;

import java.math.BigDecimal;

public record PartyListSummary(long totalParties, long partiesWithBalance,
                               BigDecimal totalOutstanding, BigDecimal totalAdvance) {
}