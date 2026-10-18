package com.vira.party;

import java.math.BigDecimal;

public record PartyResponse(
        Long id, String name, String phone, String address, String city, String state,
        String remarks, BigDecimal openingBalance, BigDecimal currentBalance) {}