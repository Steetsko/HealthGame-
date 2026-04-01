package com.healthgame.backend.achievements.api;

import com.healthgame.backend.achievements.application.AchievementApplicationService;
import com.healthgame.backend.achievements.application.AchievementResponse;
import com.healthgame.backend.identity.infrastructure.security.AuthenticatedUser;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import java.util.List;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/achievements")
@SecurityRequirement(name = "bearerAuth")
public class AchievementController {

    private final AchievementApplicationService achievementApplicationService;

    public AchievementController(AchievementApplicationService achievementApplicationService) {
        this.achievementApplicationService = achievementApplicationService;
    }

    @Operation(summary = "Get current user's achievements")
    @GetMapping("/my")
    public List<AchievementResponse> myAchievements(@AuthenticationPrincipal AuthenticatedUser authenticatedUser) {
        return achievementApplicationService.getMyAchievements(authenticatedUser);
    }
}