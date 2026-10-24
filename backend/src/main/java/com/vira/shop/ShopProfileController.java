package com.vira.shop;

import jakarta.validation.Valid;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
public class ShopProfileController {

    private final ShopProfileService service;

    public ShopProfileController(ShopProfileService service) {
        this.service = service;
    }

    @GetMapping("/setup/status")
    public SetupStatus status() {
        return new SetupStatus(service.isSetupComplete());
    }

    @PostMapping("/setup")
    @ResponseStatus(HttpStatus.CREATED)
    public ShopProfileResponse setup(@Valid @RequestBody ShopProfileRequest request) {
        return service.setup(request);
    }

    @GetMapping("/shop-profile")
    public ShopProfileResponse get() {
        return service.get();
    }

    @PutMapping("/shop-profile")
    public ShopProfileResponse update(@Valid @RequestBody ShopProfileRequest request) {
        return service.update(request);
    }
}