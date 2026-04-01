package com.healthgame.backend.habits.infrastructure.persistence;

import org.springframework.data.jpa.repository.JpaRepository;

public interface HabitCategoryRepository extends JpaRepository<HabitCategoryEntity, Integer> {
    boolean existsByNameIgnoreCase(String name);
}