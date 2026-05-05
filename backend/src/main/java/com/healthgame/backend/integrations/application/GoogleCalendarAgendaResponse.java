package com.healthgame.backend.integrations.application;

import java.util.List;

public record GoogleCalendarAgendaResponse(
        boolean connected,
        String provider,
        List<GoogleCalendarEventResponse> events,
        String message
) {
}