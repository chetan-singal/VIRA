package com.vira.bill;

import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/bills")
public class BillController {

    private final BillService billService;

    public BillController(BillService billService) {
        this.billService = billService;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public BillResponse create(@Valid @RequestBody BillRequest request) {
        return billService.create(request);
    }

    @PutMapping("/{id}")
    public BillResponse edit(@PathVariable Long id, @Valid @RequestBody BillRequest request) {
        return billService.edit(id, request);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) {
        billService.delete(id);
    }

    @PostMapping("/{id}/restore")
    public BillResponse restore(@PathVariable Long id) {
        return billService.restore(id);
    }
}