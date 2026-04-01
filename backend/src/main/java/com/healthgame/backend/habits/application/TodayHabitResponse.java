package com.healthgame.backend.habits.application;

import java.time.LocalDate;
import java.time.LocalTime;

public record TodayHabitResponse(
        Long id,
        String name,
        String categoryName,
        Integer targetValue,
        String unit,
        String frequency,
        LocalDate date,
        LocalTime plannedTime,
        Integer minTimesPerDay,
        boolean completedToday
) {
}