package com.healthgame.backend.challenges.application;

public record ChallengeTargetResponse(
        Long id,
        String targetKind,
        Long habitId,
        Integer categoryId,
        String categoryName,
        String unit
) {
}