package com.healthgame.backend.challenges.application;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ChallengeTargetRequest(
        @NotBlank String targetKind,
        Long habitId,
        Integer categoryId,
        @Size(max = 20) String unit
) {
}