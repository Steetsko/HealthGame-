package com.healthgame.backend.challenges.application;

import java.time.LocalDate;
import java.util.List;

public record ChallengeDetailsResponse(
        Long id,
        Long creatorId,
        String name,
        String description,
        LocalDate startDate,
        LocalDate endDate,
        String goalType,
        Integer goalValue,
        String status,
        boolean isPublic,
        String currentUserParticipantStatus,
        String currentUserParticipantRole,
        String coverImageUrl,
        List<ChallengeTargetResponse> targets,
        List<ChallengeParticipantResponse> participants,
        ChallengeProgressResponse currentUserProgress
) {
}