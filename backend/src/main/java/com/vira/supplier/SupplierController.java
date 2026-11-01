package com.vira.supplier;

import com.vira.common.PageResponse;

import jakarta.validation.Valid;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/suppliers")
public class SupplierController {

    private final SupplierService supplierService;
    private final SupplierSummaryService summaryService;

    public SupplierController(SupplierService supplierService, SupplierSummaryService summaryService) {
        this.supplierService = supplierService;
        this.summaryService = summaryService;
    }

    @GetMapping
    public PageResponse<SupplierResponse> list(@RequestParam(required = false) String q,
                                        @RequestParam(defaultValue = "false") boolean deleted,
                                               Pageable pageable) {
        return supplierService.list(q, deleted, pageable);
    }

    @GetMapping("/summary")
    public SupplierListSummary summary() {
        return summaryService.overall();
    }

    @GetMapping("/{id}")
    public SupplierResponse get(@PathVariable Long id) {
        return supplierService.get(id);
    }

    @GetMapping("/{id}/summary")
    public SupplierPaymentTotals supplierSummary(@PathVariable Long id) {
        return summaryService.forSupplier(id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public SupplierResponse create(@Valid @RequestBody SupplierRequest request) {
        return supplierService.create(request);
    }

    @PutMapping("/{id}")
    public SupplierResponse update(@PathVariable Long id, @Valid @RequestBody SupplierUpdateRequest request) {
        return supplierService.update(id, request);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) {
        supplierService.delete(id);
    }

    @PostMapping("/{id}/restore")
    public SupplierResponse restore(@PathVariable Long id) {
        supplierService.restore(id);
        return supplierService.get(id);
    }
}