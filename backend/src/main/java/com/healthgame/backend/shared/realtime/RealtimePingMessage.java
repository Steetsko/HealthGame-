package com.healthgame.backend.shared.realtime;

public record RealtimePingMessage(
        String text,
        String timestamp
) {
}
