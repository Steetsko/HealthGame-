package com.healthgame.backend.challenges.application.progress;

import com.healthgame.backend.habits.infrastructure.persistence.HabitCheckinEntity;
import java.util.List;
import org.springframework.stereotype.Component;

@Component
public class DaysCountGoalProgressStrategy implements ChallengeGoalProgressStrategy {

    @Override
    public String supportedGoalType() {
        return "DAYS_COUNT";
    }

    @Override
    public int calculateCurrentValue(List<HabitCheckinEntity> checkins) {
        return (int) checkins.stream().map(HabitCheckinEntity::getCheckinDate).distinct().count();
    }
}
