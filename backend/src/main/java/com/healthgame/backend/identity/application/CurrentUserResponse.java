package com.healthgame.backend.identity.application;

import java.time.Instant;
import java.util.List;

public record CurrentUserResponse(
        Long id,
        String email,
        String phone,
        String nickname,
        String firstName,
        String avatarUrl,
        String timezone,
        String status,
        Instant registeredAt,
        Instant lastLoginAt,
        List<String> roles
) {
}