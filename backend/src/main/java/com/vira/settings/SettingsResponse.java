package com.vira.settings;

public record SettingsResponse(String defaultBillType, String defaultFocusField,
                               String defaultPrinter, String dateFormat, String theme) {
}