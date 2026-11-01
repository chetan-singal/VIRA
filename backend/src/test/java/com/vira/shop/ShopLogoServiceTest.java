package com.vira.shop;

import com.vira.common.ApiError;
import com.vira.common.FieldValidationException;
import com.vira.common.NotFoundException;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.io.IOException;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.LocalDate;
import java.util.List;
import java.util.stream.Stream;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
class ShopLogoServiceTest {

    @TempDir
    Path logoDir;

    @Autowired private ShopProfileService shopProfileService;
    @Autowired private ShopProfileRepository profiles;

    private ShopLogoService logos() {
        return new ShopLogoService(profiles, logoDir.toString());
    }

    private void setup() {
        shopProfileService.setup(new ShopProfileRequest("Chirag Auto Parts", null, null, null, null, null, null, null, null,
                "C-", "P-", "PV-", "SP-", 1, new BigDecimal("0.00"),
                LocalDate.of(2026, 4, 1), true, true, true, true, true, true, null));
    }

    private static byte[] png(int size) {
        byte[] bytes = new byte[size];
        byte[] signature = {(byte) 0x89, 'P', 'N', 'G', 0x0D, 0x0A, 0x1A, 0x0A};
        System.arraycopy(signature, 0, bytes, 0, signature.length);
        return bytes;
    }

    private static byte[] jpeg(int size) {
        byte[] bytes = new byte[size];
        byte[] signature = {(byte) 0xFF, (byte) 0xD8, (byte) 0xFF, (byte) 0xE0};
        System.arraycopy(signature, 0, bytes, 0, signature.length);
        return bytes;
    }

    private static MockMultipartFile file(String name, byte[] bytes) {
        return new MockMultipartFile("file", name, "application/octet-stream", bytes);
    }

    private List<String> storedFiles() throws IOException {
        try (Stream<Path> files = Files.list(logoDir)) {
            return files.map(p -> p.getFileName().toString()).sorted().toList();
        }
    }

    private void assertRefused(MockMultipartFile upload) throws IOException {
        assertThatThrownBy(() -> logos().upload(upload))
                .isInstanceOf(FieldValidationException.class)
                .satisfies(e -> assertThat(((FieldValidationException) e).getErrors())
                        .extracting(ApiError.FieldError::field)
                        .containsExactly("file"));
        assertThat(shopProfileService.get().hasLogo()).isFalse();
        assertThat(storedFiles()).isEmpty();
    }

    @Test
    void aValidPngIsStoredAndHasLogoBecomesTrue() throws IOException {
        setup();
        assertThat(shopProfileService.get().hasLogo()).isFalse();

        logos().upload(file("logo.png", png(64)));

        assertThat(shopProfileService.get().hasLogo()).isTrue();
        assertThat(profiles.findById(1L).orElseThrow().getLogoPath()).isEqualTo("shop-logo.png");
        assertThat(Files.readAllBytes(logoDir.resolve("shop-logo.png"))).isEqualTo(png(64));
        ShopLogoService.Logo logo = logos().load();
        assertThat(logo.contentType()).isEqualTo("image/png");
        assertThat(logo.bytes()).isEqualTo(png(64));
    }

    @Test
    void aTextFileNamedPngIsRefused() throws IOException {
        setup();
        assertRefused(file("logo.png", "this is not an image".getBytes(StandardCharsets.UTF_8)));
    }

    @Test
    void aFileOverTwoMegabytesIsRefused() throws IOException {
        setup();
        assertRefused(file("logo.png", png(2 * 1024 * 1024 + 1)));
    }

    @Test
    void uploadingTheOtherFormatLeavesExactlyOneFile() throws IOException {
        setup();
        ShopLogoService logos = logos();
        logos.upload(file("logo.png", png(64)));
        assertThat(storedFiles()).containsExactly("shop-logo.png");

        logos.upload(file("logo.jpg", jpeg(64)));

        assertThat(storedFiles()).containsExactly("shop-logo.jpg");
        assertThat(profiles.findById(1L).orElseThrow().getLogoPath()).isEqualTo("shop-logo.jpg");
        assertThat(logos.load().contentType()).isEqualTo("image/jpeg");
    }

    @Test
    void removeClearsThePathAndTheFile() throws IOException {
        setup();
        ShopLogoService logos = logos();
        logos.upload(file("logo.png", png(64)));

        logos.remove();

        assertThat(shopProfileService.get().hasLogo()).isFalse();
        assertThat(storedFiles()).isEmpty();
        logos.remove();
        assertThat(shopProfileService.get().hasLogo()).isFalse();
    }

    @Test
    void loadWithNoLogoIsNotFound() {
        setup();
        assertThatThrownBy(() -> logos().load()).isInstanceOf(NotFoundException.class);
    }
}