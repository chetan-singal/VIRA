package com.vira.party;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** Master-data edit. Opening Balance and Current Balance are deliberately not editable (SRS §9.1). */
public record PartyUpdateRequest(
        @NotBlank @Size(max = 150) String name,
        @Size(max = 20) String phone,
        @Size(max = 255) String address,
        @Size(max = 100) String city,
        @Size(max = 100) String state,
        @Size(max = 500) String remarks) {
}