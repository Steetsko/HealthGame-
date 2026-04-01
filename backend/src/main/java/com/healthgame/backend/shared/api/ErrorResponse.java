package com.healthgame.backend.shared.api;

import java.time.Instant;
import java.util.List;

public record ErrorResponse(
        Instant timestamp,
        int status,
        String error,
        String code,
        String message,
        String path,
        List<FieldErrorDetails> fieldErrors
) {

    public record FieldErrorDetails(String field, String message) {
    }
}
