package com.healthgame.backend.identity.application;

import java.time.Instant;
import java.time.LocalDate;

public record PublicUserChallengeResponse(
        Long id,
        String name,
        String description,
        String status,
        String participantStatus,
        String participantRole,
        LocalDate startDate,
        LocalDate endDate,
        Integer goalValue,
        Integer participantCount,
        String coverImageUrl,
        Instant joinedAt
) {
}
