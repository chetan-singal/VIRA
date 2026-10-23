package com.vira.party;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record PartyResponse(
        Long id, String name, String phone, String address, String city, String state,
        String remarks, BigDecimal openingBalance, BigDecimal currentBalance,
        boolean deleted, LocalDateTime deletedAt) {
}