package com.vira.voucher;

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

    @GetMapping("/{id}")
    public PaymentVoucherResponse get(@PathVariable Long id) {
        return service.get(id);
    }

    @GetMapping
    public PageResponse<PaymentVoucherResponse> list(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(required = false) Long partyId,
            @RequestParam(required = false) String keyword,
            @RequestParam(defaultValue = "false") boolean includeDeleted,
            @PageableDefault(sort = {"paymentDate", "id"}, direction = Sort.Direction.DESC) Pageable pageable) {
        return service.list(from, to, partyId, keyword, includeDeleted, pageable);
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