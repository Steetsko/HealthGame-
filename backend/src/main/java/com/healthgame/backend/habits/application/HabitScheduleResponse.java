package com.healthgame.backend.habits.application;

import java.time.LocalTime;

public record HabitScheduleResponse(
        Long id,
        Integer dayOfWeek,
        LocalTime timeOfDay,
        Integer minTimesPerDay,
        boolean isEnabled
) {
}