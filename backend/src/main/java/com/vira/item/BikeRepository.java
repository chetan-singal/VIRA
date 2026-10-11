package com.vira.item;

import org.springframework.data.jpa.repository.JpaRepository;

public interface BikeRepository extends JpaRepository<Bike, Long> {
    boolean existsByNameIgnoreCase(String name);
}