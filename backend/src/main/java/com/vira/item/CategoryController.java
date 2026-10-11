package com.vira.item;

import com.vira.common.BusinessRuleException;
import jakarta.validation.Valid;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/part-categories")
public class CategoryController {

    private final PartCategoryRepository categories;

    public CategoryController(PartCategoryRepository categories) {
        this.categories = categories;
    }

    @GetMapping
    public List<IdName> list() {
        return categories.findAll(Sort.by(Sort.Direction.ASC, "name")).stream()
                .map(c -> new IdName(c.getId(), c.getName()))
                .toList();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public IdName create(@Valid @RequestBody NameRequest request) {
        String name = request.name().trim();
        if (categories.existsByNameIgnoreCase(name)) {
            throw new BusinessRuleException("DUPLICATE_NAME", "That name already exists");
        }
        PartCategory saved = categories.save(new PartCategory(name));
        return new IdName(saved.getId(), saved.getName());
    }
}