package com.vira.item;

import com.vira.common.PageResponse;

import jakarta.validation.Valid;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/items")
public class ItemController {

    private final ItemService itemService;

    public ItemController(ItemService itemService) {
        this.itemService = itemService;
    }

    @GetMapping
    public PageResponse<ItemResponse> list(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) ItemType type,
            @RequestParam(required = false) Long categoryId,
            Pageable pageable) {
        return itemService.list(q, type, categoryId, pageable);
    }

    @GetMapping("/{id}")
    public ItemResponse get(@PathVariable Long id) {
        return itemService.get(id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ItemResponse create(@Valid @RequestBody ItemRequest request) {
        return itemService.create(request);
    }

    @PutMapping("/{id}")
    public ItemResponse update(@PathVariable Long id, @Valid @RequestBody ItemRequest request) {
        return itemService.update(id, request);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) {
        itemService.delete(id);
    }
}