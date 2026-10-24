package com.vira.daybook;

import com.vira.bill.BillType;

import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;

@RestController
@RequestMapping("/api/daybook")
public class DaybookController {

    private final DaybookService service;

    public DaybookController(DaybookService service) {
        this.service = service;
    }

    @GetMapping
    public DaybookResponse query(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(required = false) BillType billType,
            @RequestParam(required = false) Long partyId,
            @RequestParam(required = false) String keyword,
            @RequestParam(defaultValue = "false") boolean includeDeleted,
            @PageableDefault(sort = {"billDate", "id"}, direction = Sort.Direction.DESC) Pageable pageable) {
        return service.query(new BillFilter(from, to, billType, partyId, keyword, includeDeleted), pageable);
    }
}