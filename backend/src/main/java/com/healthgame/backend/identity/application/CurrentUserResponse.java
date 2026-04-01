package com.healthgame.backend.identity.application;

import java.time.Instant;

public record CurrentUserResponse(
        Long id,
        String email,
        String phone,
        String nickname,
        String firstName,
        String timezone,
        String status,
        Instant registeredAt,
        Instant lastLoginAt
) {
}