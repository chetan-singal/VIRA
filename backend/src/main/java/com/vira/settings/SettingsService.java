package com.vira.settings;

import com.vira.common.FieldErrors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class SettingsService {

    static final String DEFAULT_BILL_TYPE = "default_bill_type";
    static final String DEFAULT_FOCUS_FIELD = "default_focus_field";
    static final String DEFAULT_PRINTER = "default_printer";
    static final String DATE_FORMAT = "date_format";
    static final String THEME = "theme";

    private static final List<String> BILL_TYPES = List.of("CASH", "PARTY");
    private static final List<String> DATE_FORMATS = List.of("DD-MM-YYYY", "MM-DD-YYYY", "YYYY-MM-DD");
    private static final List<String> THEMES = List.of("light", "dark");

    private final AppSettingRepository settings;

    public SettingsService(AppSettingRepository settings) {
        this.settings = settings;
    }

    @Transactional(readOnly = true)
    public SettingsResponse get() {
        Map<String, String> m = settings.findAll().stream().collect(Collectors.toMap(
                AppSetting::getSettingKey,
                s -> s.getSettingValue() == null ? "" : s.getSettingValue(),
                (a, b) -> a));
        return new SettingsResponse(
                m.getOrDefault(DEFAULT_BILL_TYPE, "CASH"),
                m.getOrDefault(DEFAULT_FOCUS_FIELD, "item_search"),
                m.getOrDefault(DEFAULT_PRINTER, ""),
                m.getOrDefault(DATE_FORMAT, "DD-MM-YYYY"),
                m.getOrDefault(THEME, "light"));
    }

    @Transactional
    public SettingsResponse update(SettingsRequest r) {
        FieldErrors errors = new FieldErrors();
        if (!BILL_TYPES.contains(r.defaultBillType())) {
            errors.add("defaultBillType", "Must be CASH or PARTY");
        }
        if (!r.defaultFocusField().matches("[a-z_]+")) {
            errors.add("defaultFocusField", "Use lower-case letters and underscores only");
        }
        if (!DATE_FORMATS.contains(r.dateFormat())) {
            errors.add("dateFormat", "Must be DD-MM-YYYY, MM-DD-YYYY or YYYY-MM-DD");
        }
        if (!THEMES.contains(r.theme())) {
            errors.add("theme", "Must be light or dark");
        }
        errors.throwIfAny();

        put(DEFAULT_BILL_TYPE, r.defaultBillType());
        put(DEFAULT_FOCUS_FIELD, r.defaultFocusField());
        put(DEFAULT_PRINTER, r.defaultPrinter() == null ? "" : r.defaultPrinter().trim());
        put(DATE_FORMAT, r.dateFormat());
        put(THEME, r.theme());
        return get();
    }

    private void put(String key, String value) {
        AppSetting s = settings.findById(key).orElseGet(() -> new AppSetting(key));
        s.setSettingValue(value);
        settings.save(s);
    }
}