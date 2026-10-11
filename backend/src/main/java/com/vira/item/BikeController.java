package com.vira.item;

import com.vira.common.BusinessRuleException;
import jakarta.validation.Valid;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/bikes")
public class BikeController {

    private final BikeRepository bikes;

    public BikeController(BikeRepository bikes) {
        this.bikes = bikes;
    }

    @GetMapping
    public List<IdName> list() {
        return bikes.findAll(Sort.by(Sort.Direction.ASC, "name")).stream()
                .map(b -> new IdName(b.getId(), b.getName()))
                .toList();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public IdName create(@Valid @RequestBody NameRequest request) {
        String name = request.name().trim();
        if (bikes.existsByNameIgnoreCase(name)) {
            throw new BusinessRuleException("DUPLICATE_NAME", "That name already exists");
        }
        Bike saved = bikes.save(new Bike(name));
        return new IdName(saved.getId(), saved.getName());
    }
}