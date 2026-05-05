package com.healthgame.backend.achievements.application;

import java.time.Instant;

public record AchievementResponse(
        Integer id,
        String code,
        String title,
        String name,
        String description,
        String icon,
        String rarity,
        Boolean unlocked,
        Instant unlockedAt,
        Instant awardedAt,
        String source,
        Integer progressCurrent,
        Integer progressTarget,
        Long awardId
) {
}
