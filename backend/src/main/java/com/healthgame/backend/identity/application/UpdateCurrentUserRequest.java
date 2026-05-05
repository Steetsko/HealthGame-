package com.healthgame.backend.identity.application;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record UpdateCurrentUserRequest(
        @Email @NotBlank String email,
        @NotBlank @Size(min = 3, max = 64) String nickname,
        @NotBlank String phone,
        @NotBlank @Size(min = 1, max = 100) String firstName,
        @NotBlank @Size(min = 1, max = 64) String timezone,
        @Size(max = 2000000) String avatarUrl
) {
}
