package com.healthgame.backend.identity.infrastructure.security;

import java.time.Duration;
import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app.security.jwt")
public record JwtProperties(
        String issuer,
        Duration accessTokenExpiration,
        Duration refreshTokenExpiration,
        String secret
) {
}
