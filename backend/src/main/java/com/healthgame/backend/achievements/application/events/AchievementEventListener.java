package com.healthgame.backend.achievements.application.events;

import com.healthgame.backend.achievements.application.AchievementApplicationService;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

@Component
public class AchievementEventListener {

    private final AchievementApplicationService achievementApplicationService;

    public AchievementEventListener(AchievementApplicationService achievementApplicationService) {
        this.achievementApplicationService = achievementApplicationService;
    }

    @EventListener
    public void onHabitCheckinCreated(HabitCheckinCreatedEvent event) {
        achievementApplicationService.awardFirstCheckin(event.userId());
    }

    @EventListener
    public void onChallengeJoined(ChallengeJoinedEvent event) {
        achievementApplicationService.awardChallengeJoiner(event.userId());
    }
}
