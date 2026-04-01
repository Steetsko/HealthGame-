package com.healthgame.backend.habits.application;

public record HabitCategoryResponse(
        Integer id,
        String name,
        String description,
        String icon
) {
}

