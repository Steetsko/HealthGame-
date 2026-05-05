package com.healthgame.backend.challenges.application.progress;

import com.healthgame.backend.challenges.infrastructure.persistence.ChallengeTargetEntity;
import com.healthgame.backend.habits.infrastructure.persistence.HabitEntity;

public interface ChallengeTargetMatchingStrategy {

    String supportedTargetKind();

    boolean matches(ChallengeTargetEntity target, HabitEntity habit);
}
