package com.healthgame.backend.challenges.application;

import java.math.BigDecimal;
import java.time.LocalDate;

public record ChallengeSummaryResponse(
        Long id,
        String name,
        String description,
        LocalDate startDate,
        LocalDate endDate,
        String goalType,
        Integer goalValue,
        String status,
        boolean isPublic,
        String currentUserParticipantStatus,
        Integer currentValue,
        BigDecimal completionPercent,
        Integer participantCount,
        String coverImageUrl
) {
}