package com.healthgame.backend.admin.application;

import jakarta.validation.constraints.Size;

public record AdminUserStatusRequest(
        @Size(max = 255) String note
) {
}