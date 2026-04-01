package com.healthgame.backend.habits.application;

import com.fasterxml.jackson.annotation.JsonFormat;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Positive;
import java.time.LocalTime;

public record HabitScheduleRequest(
        @Min(1) @Max(7) Integer dayOfWeek,
        @JsonFormat(pattern = "HH:mm:ss") LocalTime timeOfDay,
        @Positive Integer minTimesPerDay,
        Boolean isEnabled
) {
}