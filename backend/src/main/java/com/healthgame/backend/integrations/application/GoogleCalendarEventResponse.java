package com.healthgame.backend.integrations.application;

public record GoogleCalendarEventResponse(
        String title,
        String startAt,
        boolean allDay,
        String link
) {
}