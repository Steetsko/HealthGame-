package com.healthgame.backend.integrations.application;

public record GoogleCalendarSyncResponse(
        boolean connected,
        int createdCount,
        int skippedCount,
        String message
) {
}
