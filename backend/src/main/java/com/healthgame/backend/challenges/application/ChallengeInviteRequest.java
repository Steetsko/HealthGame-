package com.healthgame.backend.challenges.application;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public record ChallengeInviteRequest(
        @NotBlank @Email String email
) {
}