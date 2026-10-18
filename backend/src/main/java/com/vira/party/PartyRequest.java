package com.vira.party;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;

public record PartyRequest(
        @NotBlank @Size(max = 150) String name,
        @Size(max = 20) String phone,
        @Size(max = 255) String address,
        @Size(max = 100) String city,
        @Size(max = 100) String state,
        @Size(max = 500) String remarks,
        BigDecimal openingBalance) {}