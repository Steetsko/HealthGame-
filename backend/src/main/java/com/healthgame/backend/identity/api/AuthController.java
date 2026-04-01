package com.healthgame.backend.identity.api;

import com.healthgame.backend.identity.application.AuthApplicationService;
import com.healthgame.backend.identity.application.AuthResponse;
import com.healthgame.backend.identity.application.LoginRequest;
import com.healthgame.backend.identity.application.LogoutRequest;
import com.healthgame.backend.identity.application.RefreshTokenRequest;
import com.healthgame.backend.identity.application.RegisterRequest;
import com.healthgame.backend.identity.application.RegisteredUserResponse;
import com.healthgame.backend.identity.infrastructure.security.AuthenticatedUser;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {

    private final AuthApplicationService authApplicationService;

    public AuthController(AuthApplicationService authApplicationService) {
        this.authApplicationService = authApplicationService;
    }

    @Operation(summary = "Register a new user")
    @PostMapping("/register")
    @ResponseStatus(HttpStatus.CREATED)
    public RegisteredUserResponse register(@Valid @RequestBody RegisterRequest request) {
        return authApplicationService.register(request);
    }

    @Operation(summary = "Authenticate user and issue token pair")
    @PostMapping("/login")
    public AuthResponse login(@Valid @RequestBody LoginRequest request) {
        return authApplicationService.login(request);
    }

    @Operation(summary = "Rotate refresh token and issue a new token pair")
    @PostMapping("/refresh")
    public AuthResponse refresh(@Valid @RequestBody RefreshTokenRequest request) {
        return authApplicationService.refresh(request);
    }

    @Operation(
            summary = "Logout current user by revoking refresh token",
            security = @SecurityRequirement(name = "bearerAuth")
    )
    @PostMapping("/logout")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void logout(@AuthenticationPrincipal AuthenticatedUser authenticatedUser, @Valid @RequestBody LogoutRequest request) {
        authApplicationService.logout(authenticatedUser, request);
    }
}