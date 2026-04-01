package com.healthgame.backend.habits.application;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;
import java.util.List;

public record HabitUpdateRequest(
        @NotNull Integer categoryId,
        @NotBlank @Size(max = 120) String name,
        @Size(max = 1000) String description,
        @NotNull LocalDate startDate,
        LocalDate endDate,
        @NotNull @Positive Integer targetValue,
        @NotBlank @Size(max = 20) String unit,
        @NotBlank String frequency,
        @NotNull Boolean isActive,
        @Valid List<HabitScheduleRequest> schedules
) {
}