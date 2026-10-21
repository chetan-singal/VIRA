package com.vira.supplier;

import jakarta.validation.Valid;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/supplier-payments")
public class SupplierPaymentController {

    private final SupplierPaymentService service;

    public SupplierPaymentController(SupplierPaymentService service) {
        this.service = service;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public SupplierPaymentResponse create(@Valid @RequestBody SupplierPaymentRequest request) {
        return service.create(request);
    }

    @PutMapping("/{id}")
    public SupplierPaymentResponse edit(@PathVariable Long id, @Valid @RequestBody SupplierPaymentRequest request) {
        return service.edit(id, request);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) {
        service.delete(id);
    }

    @PostMapping("/{id}/restore")
    public SupplierPaymentResponse restore(@PathVariable Long id) {
        return service.restore(id);
    }
}