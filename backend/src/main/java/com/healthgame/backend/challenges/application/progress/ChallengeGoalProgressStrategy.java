package com.healthgame.backend.challenges.application.progress;

import com.healthgame.backend.habits.infrastructure.persistence.HabitCheckinEntity;
import java.util.List;

public interface ChallengeGoalProgressStrategy {

    String supportedGoalType();

    int calculateCurrentValue(List<HabitCheckinEntity> checkins);
}
