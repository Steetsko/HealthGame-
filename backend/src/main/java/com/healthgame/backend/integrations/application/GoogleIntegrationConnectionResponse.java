package com.healthgame.backend.integrations.application;

public record GoogleIntegrationConnectionResponse(
        boolean connected,
        String message
) {
}
