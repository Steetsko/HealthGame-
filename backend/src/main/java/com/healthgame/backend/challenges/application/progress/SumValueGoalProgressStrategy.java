package com.healthgame.backend.challenges.application.progress;

import com.healthgame.backend.habits.infrastructure.persistence.HabitCheckinEntity;
import java.util.List;
import org.springframework.stereotype.Component;

@Component
public class SumValueGoalProgressStrategy implements ChallengeGoalProgressStrategy {

    @Override
    public String supportedGoalType() {
        return "SUM_VALUE";
    }

    @Override
    public int calculateCurrentValue(List<HabitCheckinEntity> checkins) {
        return checkins.stream().mapToInt(checkin -> checkin.getValue() == null ? 0 : checkin.getValue()).sum();
    }
}
