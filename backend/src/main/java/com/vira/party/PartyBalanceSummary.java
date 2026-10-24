package com.vira.party;

import java.math.BigDecimal;

public record PartyBalanceSummary(BigDecimal openingBalance, BigDecimal totalBilled,
                                  BigDecimal totalPaid, BigDecimal currentBalance) {
}