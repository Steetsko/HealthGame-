package com.healthgame.backend.community.application;

import jakarta.validation.constraints.NotBlank;

public record PostReactionRequest(
        @NotBlank String reaction
) {
}