package com.vira.shop;

import com.vira.common.FieldValidationException;
import com.vira.common.NotFoundException;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.Arrays;

@Service
public class ShopLogoService {

    static final long MAX_BYTES = 2L * 1024 * 1024;

    private static final Long ID = 1L;
    private static final String BASE_NAME = "shop-logo";
    private static final byte[] PNG_SIGNATURE = {(byte) 0x89, 'P', 'N', 'G', 0x0D, 0x0A, 0x1A, 0x0A};
    private static final byte[] JPEG_SIGNATURE = {(byte) 0xFF, (byte) 0xD8, (byte) 0xFF};

    public record Logo(byte[] bytes, String contentType) {
    }

    private final ShopProfileRepository profiles;
    private final Path logoDir;

    public ShopLogoService(ShopProfileRepository profiles, @Value("${vira.logo-dir}") String logoDir) {
        this.profiles = profiles;
        this.logoDir = Paths.get(logoDir).toAbsolutePath().normalize();
    }

    @Transactional
    public void upload(MultipartFile file) {
        ShopProfile profile = profile();
        byte[] bytes = read(file);
        String extension = extensionOf(bytes);
        String fileName = BASE_NAME + "." + extension;
        String otherName = BASE_NAME + "." + ("png".equals(extension) ? "jpg" : "png");
        try {
            Files.createDirectories(logoDir);
            Path temp = Files.createTempFile(logoDir, "upload-", ".tmp");
            try {
                Files.write(temp, bytes);
                Files.move(temp, logoDir.resolve(fileName), StandardCopyOption.REPLACE_EXISTING);
            } finally {
                Files.deleteIfExists(temp);
            }
            Files.deleteIfExists(logoDir.resolve(otherName));
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
        profile.setLogoPath(fileName);
    }

    @Transactional(readOnly = true)
    public Logo load() {
        String name = profile().getLogoPath();
        if (name == null || name.isBlank()) {
            throw new NotFoundException("No logo has been uploaded.");
        }
        Path path = logoDir.resolve(name).normalize();
        if (!path.startsWith(logoDir) || !Files.isRegularFile(path)) {
            throw new NotFoundException("The logo file is missing.");
        }
        try {
            return new Logo(Files.readAllBytes(path), name.endsWith(".png") ? "image/png" : "image/jpeg");
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }

    @Transactional
    public void remove() {
        ShopProfile profile = profile();
        try {
            Files.deleteIfExists(logoDir.resolve(BASE_NAME + ".png"));
            Files.deleteIfExists(logoDir.resolve(BASE_NAME + ".jpg"));
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
        profile.setLogoPath(null);
    }

    private ShopProfile profile() {
        return profiles.findById(ID).orElseThrow(
                () -> new NotFoundException("The shop has not been set up yet."));
    }

    private static byte[] read(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new FieldValidationException("file", "The file is empty.");
        }
        if (file.getSize() > MAX_BYTES) {
            throw tooLarge();
        }
        try {
            byte[] bytes = file.getBytes();
            if (bytes.length > MAX_BYTES) {
                throw tooLarge();
            }
            return bytes;
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }

    private static String extensionOf(byte[] bytes) {
        if (startsWith(bytes, PNG_SIGNATURE)) {
            return "png";
        }
        if (startsWith(bytes, JPEG_SIGNATURE)) {
            return "jpg";
        }
        throw new FieldValidationException("file", "Only PNG or JPEG images are accepted.");
    }

    private static boolean startsWith(byte[] bytes, byte[] prefix) {
        return bytes.length >= prefix.length
                && Arrays.equals(bytes, 0, prefix.length, prefix, 0, prefix.length);
    }

    private static FieldValidationException tooLarge() {
        return new FieldValidationException("file", "The image is larger than 2 MB.");
    }
}