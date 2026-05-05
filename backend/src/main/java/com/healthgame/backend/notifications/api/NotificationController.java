package com.healthgame.backend.notifications.api;

import com.healthgame.backend.identity.infrastructure.security.AuthenticatedUser;
import com.healthgame.backend.notifications.application.NotificationApplicationService;
import com.healthgame.backend.notifications.application.NotificationResponse;
import com.healthgame.backend.notifications.application.UnreadNotificationCountResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import java.util.List;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/notifications")
@SecurityRequirement(name = "bearerAuth")
public class NotificationController {

    private final NotificationApplicationService notificationApplicationService;

    public NotificationController(NotificationApplicationService notificationApplicationService) {
        this.notificationApplicationService = notificationApplicationService;
    }

    @Operation(summary = "Get current user's notifications")
    @GetMapping
    public List<NotificationResponse> getMyNotifications(@AuthenticationPrincipal AuthenticatedUser authenticatedUser) {
        return notificationApplicationService.getMyNotifications(authenticatedUser);
    }

    @Operation(summary = "Get unread notifications count")
    @GetMapping("/unread-count")
    public UnreadNotificationCountResponse getUnreadCount(@AuthenticationPrincipal AuthenticatedUser authenticatedUser) {
        return notificationApplicationService.getUnreadCount(authenticatedUser);
    }

    @Operation(summary = "Mark notification as read")
    @PutMapping("/{id}/read")
    public NotificationResponse markRead(
            @AuthenticationPrincipal AuthenticatedUser authenticatedUser,
            @PathVariable Long id
    ) {
        return notificationApplicationService.markRead(authenticatedUser, id);
    }

    @Operation(summary = "Mark all notifications as read")
    @PutMapping("/read-all")
    public UnreadNotificationCountResponse markAllRead(@AuthenticationPrincipal AuthenticatedUser authenticatedUser) {
        return notificationApplicationService.markAllRead(authenticatedUser);
    }

    @Operation(summary = "Delete notification")
    @DeleteMapping("/{id}")
    public void deleteNotification(
            @AuthenticationPrincipal AuthenticatedUser authenticatedUser,
            @PathVariable Long id
    ) {
        notificationApplicationService.deleteNotification(authenticatedUser, id);
    }
}
