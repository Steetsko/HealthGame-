package com.healthgame.backend.habits.application;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record HabitCategoryCreateRequest(
        @NotBlank @Size(max = 80) String name
) {
}

