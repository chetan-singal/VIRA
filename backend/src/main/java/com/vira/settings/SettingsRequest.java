package com.vira.settings;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record SettingsRequest(
        @NotBlank String defaultBillType,
        @NotBlank @Size(max = 50) String defaultFocusField,
        @Size(max = 255) String defaultPrinter,
        @NotBlank String dateFormat,
        @NotBlank String theme) {
}