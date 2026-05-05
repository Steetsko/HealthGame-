package com.healthgame.backend.admin.api;

import com.healthgame.backend.admin.application.AdminApplicationService;
import com.healthgame.backend.admin.application.AdminModerationRequest;
import com.healthgame.backend.admin.application.AdminUserStatusRequest;
import com.healthgame.backend.identity.infrastructure.security.AuthenticatedUser;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/admin")
@SecurityRequirement(name = "bearerAuth")
@PreAuthorize("hasRole('ADMIN')")
public class AdminController {

    private final AdminApplicationService adminApplicationService;

    public AdminController(AdminApplicationService adminApplicationService) {
        this.adminApplicationService = adminApplicationService;
    }

    @Operation(summary = "Moderate a challenge")
    @PostMapping("/challenges/{challengeId}/moderation")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void moderateChallenge(
            @AuthenticationPrincipal AuthenticatedUser authenticatedUser,
            @PathVariable Long challengeId,
            @Valid @RequestBody AdminModerationRequest request
    ) {
        adminApplicationService.moderateChallenge(authenticatedUser, challengeId, request);
    }

    @Operation(summary = "Moderate a community post")
    @PostMapping("/posts/{postId}/moderation")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void moderatePost(
            @AuthenticationPrincipal AuthenticatedUser authenticatedUser,
            @PathVariable Long postId,
            @Valid @RequestBody AdminModerationRequest request
    ) {
        adminApplicationService.moderatePost(authenticatedUser, postId, request);
    }

    @Operation(summary = "Moderate a comment")
    @PostMapping("/comments/{commentId}/moderation")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void moderateComment(
            @AuthenticationPrincipal AuthenticatedUser authenticatedUser,
            @PathVariable Long commentId,
            @Valid @RequestBody AdminModerationRequest request
    ) {
        adminApplicationService.moderateComment(authenticatedUser, commentId, request);
    }

    @Operation(summary = "Block a user")
    @PostMapping("/users/{userId}/block")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void blockUser(
            @AuthenticationPrincipal AuthenticatedUser authenticatedUser,
            @PathVariable Long userId,
            @Valid @RequestBody AdminUserStatusRequest request
    ) {
        adminApplicationService.blockUser(authenticatedUser, userId, request);
    }

    @Operation(summary = "Unblock a user")
    @PostMapping("/users/{userId}/unblock")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void unblockUser(
            @AuthenticationPrincipal AuthenticatedUser authenticatedUser,
            @PathVariable Long userId
    ) {
        adminApplicationService.unblockUser(authenticatedUser, userId);
    }

    @Operation(summary = "Grant admin role to a user")
    @PostMapping("/users/{userId}/grant-admin")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void grantAdminRole(
            @AuthenticationPrincipal AuthenticatedUser authenticatedUser,
            @PathVariable Long userId
    ) {
        adminApplicationService.grantAdminRole(authenticatedUser, userId);
    }
}