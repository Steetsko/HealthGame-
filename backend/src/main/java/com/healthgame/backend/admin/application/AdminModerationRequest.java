package com.healthgame.backend.admin.application;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record AdminModerationRequest(
        @NotBlank String moderationStatus,
        @Size(max = 500) String note
) {
}