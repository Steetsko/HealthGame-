package com.healthgame.backend.habits.application;

import java.time.Instant;
import java.time.LocalDate;

public record HabitCheckinResponse(
        Long id,
        Long habitId,
        LocalDate checkinDate,
        Integer value,
        String comment,
        String source,
        Instant createdAt
) {
}