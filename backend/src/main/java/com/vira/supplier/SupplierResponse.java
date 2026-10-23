package com.vira.supplier;

import java.time.LocalDateTime;

public record SupplierResponse(Long id, String name, String phone, String city,
                               boolean deleted, LocalDateTime deletedAt) {
}