package com.healthgame.backend.challenges.application;

import java.time.Instant;

public record ChallengeParticipantResponse(
        Long userId,
        String email,
        String nickname,
        String participantRole,
        String participantStatus,
        Instant joinedAt
) {
}