package com.vira.shop;

import org.springframework.http.CacheControl;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/shop-profile/logo")
public class ShopLogoController {

    private final ShopLogoService logos;
    private final ShopProfileService profile;

    public ShopLogoController(ShopLogoService logos, ShopProfileService profile) {
        this.logos = logos;
        this.profile = profile;
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ShopProfileResponse upload(@RequestParam("file") MultipartFile file) {
        logos.upload(file);
        return profile.get();
    }

    @GetMapping
    public ResponseEntity<byte[]> get() {
        ShopLogoService.Logo logo = logos.load();
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(logo.contentType()))
                .cacheControl(CacheControl.noCache())
                .body(logo.bytes());
    }

    @DeleteMapping
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void remove() {
        logos.remove();
    }
}