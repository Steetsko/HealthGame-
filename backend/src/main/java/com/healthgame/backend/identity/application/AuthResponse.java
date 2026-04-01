package com.healthgame.backend.identity.application;

public record AuthResponse(
        String accessToken,
        String refreshToken,
        long accessTokenExpiresInSeconds,
        long refreshTokenExpiresInSeconds
) {
}
