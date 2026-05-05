package com.healthgame.backend.notifications.application;

import java.time.Instant;

public record NotificationResponse(
        Long id,
        Long actorId,
        String type,
        String title,
        String message,
        String targetUrl,
        boolean isRead,
        Instant createdAt,
        Instant readAt
) {
}
