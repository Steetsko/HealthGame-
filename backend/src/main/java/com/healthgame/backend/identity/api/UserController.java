package com.healthgame.backend.identity.api;

import com.healthgame.backend.identity.application.CurrentUserResponse;
import com.healthgame.backend.identity.application.DashboardSummaryResponse;
import com.healthgame.backend.identity.application.PublicUserProfileResponse;
import com.healthgame.backend.identity.application.UpdateCurrentUserRequest;
import com.healthgame.backend.identity.application.UserProfileApplicationService;
import com.healthgame.backend.identity.infrastructure.security.AuthenticatedUser;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import jakarta.validation.Valid;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/users")
public class UserController {

    private final UserProfileApplicationService userProfileApplicationService;

    public UserController(UserProfileApplicationService userProfileApplicationService) {
        this.userProfileApplicationService = userProfileApplicationService;
    }

    @Operation(summary = "Get current authenticated user profile", security = @SecurityRequirement(name = "bearerAuth"))
    @GetMapping("/me")
    public CurrentUserResponse me(@AuthenticationPrincipal AuthenticatedUser authenticatedUser) {
        return userProfileApplicationService.getCurrentUser(authenticatedUser);
    }

    @Operation(summary = "Get current dashboard summary", security = @SecurityRequirement(name = "bearerAuth"))
    @GetMapping("/me/dashboard-summary")
    public DashboardSummaryResponse dashboardSummary(@AuthenticationPrincipal AuthenticatedUser authenticatedUser) {
        return userProfileApplicationService.getDashboardSummary(authenticatedUser);
    }

    @Operation(summary = "Update current authenticated user profile", security = @SecurityRequirement(name = "bearerAuth"))
    @PutMapping("/me")
    public CurrentUserResponse updateMe(
            @AuthenticationPrincipal AuthenticatedUser authenticatedUser,
            @Valid @RequestBody UpdateCurrentUserRequest request
    ) {
        return userProfileApplicationService.updateCurrentUser(authenticatedUser, request);
    }

    @Operation(summary = "Get public user profile", security = @SecurityRequirement(name = "bearerAuth"))
    @GetMapping("/{userId}")
    public PublicUserProfileResponse getById(@PathVariable Long userId) {
        return userProfileApplicationService.getPublicUserProfile(userId);
    }
}