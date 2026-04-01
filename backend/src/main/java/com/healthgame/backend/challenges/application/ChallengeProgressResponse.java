package com.healthgame.backend.challenges.application;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

public record ChallengeProgressResponse(
        Integer currentValue,
        BigDecimal completionPercent,
        LocalDate lastCheckinDate,
        Instant completedAt
) {
}