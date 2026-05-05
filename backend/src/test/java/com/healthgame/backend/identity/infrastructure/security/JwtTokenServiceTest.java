package com.healthgame.backend.identity.infrastructure.security;

import java.time.Duration;
import java.time.Instant;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class JwtTokenServiceTest {

    private final JwtProperties properties = new JwtProperties(
            "healthgame-test",
            Duration.ofMinutes(15),
            Duration.ofDays(14),
            "change-this-dev-secret-change-this-dev-secret-change-this-dev-secret"
    );

    private final JwtTokenService jwtTokenService = new JwtTokenService(properties);

    @Test
    void accessTokenContainsUserDataAndType() {
        String token = jwtTokenService.createAccessToken(17L, "user@test.local");

        assertThat(jwtTokenService.isValid(token)).isTrue();
        assertThat(jwtTokenService.extractUserId(token)).isEqualTo(17L);
        assertThat(jwtTokenService.extractTokenType(token)).isEqualTo("access");
        assertThat(jwtTokenService.extractEmail(token)).isEqualTo("user@test.local");
    }

    @Test
    void refreshAndGoogleConnectTokensContainExpectedClaims() {
        String refreshToken = jwtTokenService.createRefreshToken(22L);
        String googleToken = jwtTokenService.createGoogleConnectToken(22L, "/extras");

        assertThat(jwtTokenService.extractTokenType(refreshToken)).isEqualTo("refresh");
        assertThat(jwtTokenService.extractUserId(refreshToken)).isEqualTo(22L);
        assertThat(jwtTokenService.extractTokenType(googleToken)).isEqualTo("google_connect");
        assertThat(jwtTokenService.extractRedirectPath(googleToken)).isEqualTo("/extras");
        assertThat(jwtTokenService.extractExpiration(googleToken)).isAfter(Instant.now());
    }

    @Test
    void isValidReturnsFalseForMalformedToken() {
        assertThat(jwtTokenService.isValid("broken.token")).isFalse();
    }
}
