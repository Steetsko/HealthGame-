package com.healthgame.backend.habits.application;

import java.time.LocalDate;
import java.util.List;

public record HabitResponse(
        Long id,
        Integer categoryId,
        String categoryName,
        String name,
        String description,
        LocalDate startDate,
        LocalDate endDate,
        Integer targetValue,
        String unit,
        String frequency,
        boolean isActive,
        List<HabitScheduleResponse> schedules
) {
}