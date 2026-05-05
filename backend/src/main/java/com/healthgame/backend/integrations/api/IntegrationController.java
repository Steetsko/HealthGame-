package com.healthgame.backend.integrations.api;

import com.healthgame.backend.identity.infrastructure.security.AuthenticatedUser;
import com.healthgame.backend.integrations.application.GoogleCalendarAgendaResponse;
import com.healthgame.backend.integrations.application.GoogleIntegrationConnectionResponse;
import com.healthgame.backend.integrations.application.GoogleIntegrationConnectLinkResponse;
import com.healthgame.backend.integrations.application.GoogleCalendarSyncResponse;
import com.healthgame.backend.integrations.application.GoogleIntegrationApplicationService;
import com.healthgame.backend.integrations.application.WeatherWellnessIntegrationService;
import com.healthgame.backend.integrations.application.WeatherWellnessResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/integrations")
public class IntegrationController {

    private final GoogleIntegrationApplicationService googleIntegrationApplicationService;
    private final WeatherWellnessIntegrationService weatherWellnessIntegrationService;

    public IntegrationController(
            GoogleIntegrationApplicationService googleIntegrationApplicationService,
            WeatherWellnessIntegrationService weatherWellnessIntegrationService
    ) {
        this.googleIntegrationApplicationService = googleIntegrationApplicationService;
        this.weatherWellnessIntegrationService = weatherWellnessIntegrationService;
    }

    @Operation(summary = "Get upcoming Google Calendar agenda", security = @SecurityRequirement(name = "bearerAuth"))
    @GetMapping("/google/calendar/agenda")
    public GoogleCalendarAgendaResponse getGoogleAgenda(@AuthenticationPrincipal AuthenticatedUser authenticatedUser) {
        return googleIntegrationApplicationService.getGoogleAgenda(authenticatedUser);
    }

    @Operation(summary = "Create Google Calendar connect link for current user", security = @SecurityRequirement(name = "bearerAuth"))
    @GetMapping("/google/calendar/connect-link")
    public GoogleIntegrationConnectLinkResponse getGoogleCalendarConnectLink(
            @AuthenticationPrincipal AuthenticatedUser authenticatedUser,
            @RequestParam(required = false) String redirectPath
    ) {
        return googleIntegrationApplicationService.createGoogleCalendarConnectLink(authenticatedUser, redirectPath);
    }

    @Operation(summary = "Sync current user's habits into Google Calendar", security = @SecurityRequirement(name = "bearerAuth"))
    @PostMapping("/google/calendar/sync-habits")
    public GoogleCalendarSyncResponse syncHabitsToGoogleCalendar(@AuthenticationPrincipal AuthenticatedUser authenticatedUser) {
        return googleIntegrationApplicationService.syncHabitsToCalendar(authenticatedUser);
    }

    @Operation(summary = "Disconnect Google Calendar integration", security = @SecurityRequirement(name = "bearerAuth"))
    @PostMapping("/google/calendar/disconnect")
    public GoogleIntegrationConnectionResponse disconnectGoogleCalendar(@AuthenticationPrincipal AuthenticatedUser authenticatedUser) {
        return googleIntegrationApplicationService.disconnectGoogleCalendar(authenticatedUser);
    }

    @Operation(summary = "Get weather-based wellness recommendations", security = @SecurityRequirement(name = "bearerAuth"))
    @GetMapping("/weather/wellness")
    public WeatherWellnessResponse getWeatherWellness(
            @AuthenticationPrincipal AuthenticatedUser authenticatedUser,
            @RequestParam(required = false) String city
    ) {
        return weatherWellnessIntegrationService.getWellnessForecast(authenticatedUser, city);
    }
}
