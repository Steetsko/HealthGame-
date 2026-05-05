package com.healthgame.backend.identity.application;

import java.time.Instant;
import java.util.List;

public record PublicUserProfileResponse(
        Long id,
        String nickname,
        String firstName,
        String avatarUrl,
        String timezone,
        String status,
        Instant registeredAt,
        long activeHabits,
        long activeChallenges,
        long achievements,
        int level,
        int xp,
        int nextLevelXp,
        int streakDays,
        int totalCheckins,
        List<PublicUserChallengeResponse> challengeHistory
) {
}
