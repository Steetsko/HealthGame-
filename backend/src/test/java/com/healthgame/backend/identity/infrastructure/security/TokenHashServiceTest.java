package com.healthgame.backend.identity.infrastructure.security;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class TokenHashServiceTest {

    private final TokenHashService tokenHashService = new TokenHashService();

    @Test
    void hashReturnsDeterministicSha256Hex() {
        String first = tokenHashService.hash("refresh-token");
        String second = tokenHashService.hash("refresh-token");

        assertThat(first).isEqualTo(second);
        assertThat(first).hasSize(64);
        assertThat(first).matches("^[0-9a-f]{64}$");
    }

    @Test
    void hashProducesDifferentValuesForDifferentTokens() {
        String first = tokenHashService.hash("first-token");
        String second = tokenHashService.hash("second-token");

        assertThat(first).isNotEqualTo(second);
    }
}
