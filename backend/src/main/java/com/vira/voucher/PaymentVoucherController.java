package com.vira.voucher;

import jakarta.validation.Valid;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/payment-vouchers")
public class PaymentVoucherController {

    private final PaymentVoucherService service;

    public PaymentVoucherController(PaymentVoucherService service) {
        this.service = service;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public PaymentVoucherResponse create(@Valid @RequestBody PaymentVoucherRequest request) {
        return service.create(request);
    }

    @PutMapping("/{id}")
    public PaymentVoucherResponse edit(@PathVariable Long id, @Valid @RequestBody PaymentVoucherRequest request) {
        return service.edit(id, request);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) {
        service.delete(id);
    }

    @PostMapping("/{id}/restore")
    public PaymentVoucherResponse restore(@PathVariable Long id) {
        return service.restore(id);
    }
}