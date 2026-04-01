package com.healthgame.backend.identity.application;

public record RegisteredUserResponse(
        Long id,
        String email,
        String nickname,
        String timezone
) {
}
