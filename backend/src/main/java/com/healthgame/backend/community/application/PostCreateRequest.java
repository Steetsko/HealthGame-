package com.healthgame.backend.community.application;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record PostCreateRequest(
        @NotBlank @Size(max = 2000) String text,
        @Size(max = 2000000) String imageUrl,
        @Size(max = 16) String visibility
) {
}

