package com.healthgame.backend.challenges.application.progress;

import com.healthgame.backend.challenges.infrastructure.persistence.ChallengeTargetEntity;
import com.healthgame.backend.habits.infrastructure.persistence.HabitEntity;
import org.springframework.stereotype.Component;

@Component
public class HabitTargetMatchingStrategy implements ChallengeTargetMatchingStrategy {

    @Override
    public String supportedTargetKind() {
        return "HABIT";
    }

    @Override
    public boolean matches(ChallengeTargetEntity target, HabitEntity habit) {
        return target.getHabitId() != null && target.getHabitId().equals(habit.getId());
    }
}
