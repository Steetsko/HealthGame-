package com.healthgame.backend.shared.realtime;

import java.time.Instant;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.SendTo;
import org.springframework.stereotype.Controller;

@Controller
public class RealtimePingController {

    @MessageMapping("/ping")
    @SendTo("/topic/system")
    public RealtimePingMessage ping(RealtimePingMessage message) {
        String text = message == null || message.text() == null || message.text().isBlank()
                ? "pong"
                : message.text();
        return new RealtimePingMessage(text, Instant.now().toString());
    }
}
