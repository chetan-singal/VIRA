package com.vira.supplier;

import com.vira.common.PageResponse;

import jakarta.validation.Valid;

import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;

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

    @GetMapping("/{id}")
    public SupplierPaymentResponse get(@PathVariable Long id) {
        return service.get(id);
    }

    @GetMapping
    public PageResponse<SupplierPaymentResponse> list(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(required = false) Long supplierId,
            @RequestParam(required = false) String keyword,
            @RequestParam(defaultValue = "false") boolean includeDeleted,
            @PageableDefault(sort = {"paymentDate", "id"}, direction = Sort.Direction.DESC) Pageable pageable) {
        return service.list(from, to, supplierId, keyword, includeDeleted, pageable);
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