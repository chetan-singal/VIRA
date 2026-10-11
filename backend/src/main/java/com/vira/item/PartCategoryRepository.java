package com.vira.item;

import org.springframework.data.jpa.repository.JpaRepository;

public interface PartCategoryRepository extends JpaRepository<PartCategory, Long> {
    boolean existsByNameIgnoreCase(String name);
}