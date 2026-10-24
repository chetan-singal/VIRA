package com.vira.item;

import com.vira.common.PageResponse;

import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/part-search")
public class PartSearchController {

    private final ItemService itemService;

    public PartSearchController(ItemService itemService) {
        this.itemService = itemService;
    }

    @GetMapping
    public PageResponse<ItemResponse> search(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) Long categoryId,
            @RequestParam(required = false) Long bikeId,
            @PageableDefault(sort = "name") Pageable pageable) {
        return itemService.search(q, categoryId, bikeId, pageable);
    }
}