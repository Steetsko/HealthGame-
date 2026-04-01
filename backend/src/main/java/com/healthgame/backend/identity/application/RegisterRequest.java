package com.healthgame.backend.identity.application;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record RegisterRequest(
        @Email @NotBlank String email,
        @Pattern(regexp = "^\\+?[0-9]{7,15}$") String phone,
        @NotBlank @Size(min = 8, max = 72) String password,
        @NotBlank @Size(min = 3, max = 64) String nickname,
        @Size(max = 100) String firstName,
        @NotBlank @Size(max = 64) String timezone
) {
}
