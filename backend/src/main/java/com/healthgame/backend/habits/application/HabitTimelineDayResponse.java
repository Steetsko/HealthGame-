package com.healthgame.backend.habits.application;

import java.time.LocalDate;

public record HabitTimelineDayResponse(
        LocalDate date,
        boolean scheduled,
        boolean completed,
        Integer value
) {
}