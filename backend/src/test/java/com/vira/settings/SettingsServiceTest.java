package com.vira.settings;

import com.vira.common.FieldValidationException;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
class SettingsServiceTest {

    @Autowired private SettingsService settingsService;

    @Test
    void theSeededDefaultsAreServed() {
        SettingsResponse s = settingsService.get();

        assertThat(s.defaultBillType()).isEqualTo("CASH");
        assertThat(s.defaultFocusField()).isEqualTo("item_search");
        assertThat(s.dateFormat()).isEqualTo("DD-MM-YYYY");
        assertThat(s.theme()).isEqualTo("light");
    }

    @Test
    void updateReplacesAllFiveValues() {
        SettingsResponse saved = settingsService.update(
                new SettingsRequest("PARTY", "party", "HP LaserJet", "YYYY-MM-DD", "dark"));

        assertThat(saved.defaultBillType()).isEqualTo("PARTY");
        assertThat(saved.defaultFocusField()).isEqualTo("party");
        assertThat(saved.defaultPrinter()).isEqualTo("HP LaserJet");
        assertThat(saved.dateFormat()).isEqualTo("YYYY-MM-DD");
        assertThat(saved.theme()).isEqualTo("dark");
        assertThat(settingsService.get()).isEqualTo(saved);
    }

    @Test
    void invalidValuesAreRejectedWithOneFieldErrorEach() {
        assertThatThrownBy(() -> settingsService.update(
                new SettingsRequest("OTHER", "Bad Field", "", "31/12/2026", "blue")))
                .isInstanceOf(FieldValidationException.class)
                .satisfies(e -> assertThat(((FieldValidationException) e).getErrors()).hasSize(4));
    }
}