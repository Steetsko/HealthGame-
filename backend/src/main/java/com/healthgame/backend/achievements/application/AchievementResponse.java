package com.healthgame.backend.achievements.application;

import java.time.Instant;

public record AchievementResponse(
        String code,
        String name,
        String description,
        String icon,
        String rarity,
        Instant awardedAt,
        String source
) {
}