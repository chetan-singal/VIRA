package com.vira.supplier;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** Master-data edit for a Supplier. */
public record SupplierUpdateRequest(
        @NotBlank @Size(max = 150) String name,
        @Size(max = 20) String phone,
        @Size(max = 100) String city) {
}