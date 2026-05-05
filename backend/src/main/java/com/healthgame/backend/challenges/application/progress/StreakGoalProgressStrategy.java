package com.healthgame.backend.challenges.application.progress;

import com.healthgame.backend.habits.infrastructure.persistence.HabitCheckinEntity;
import java.time.LocalDate;
import java.util.List;
import org.springframework.stereotype.Component;

@Component
public class StreakGoalProgressStrategy implements ChallengeGoalProgressStrategy {

    @Override
    public String supportedGoalType() {
        return "STREAK";
    }

    @Override
    public int calculateCurrentValue(List<HabitCheckinEntity> checkins) {
        List<LocalDate> dates = checkins.stream().map(HabitCheckinEntity::getCheckinDate).distinct().sorted().toList();
        if (dates.isEmpty()) {
            return 0;
        }
        int longest = 1;
        int current = 1;
        for (int index = 1; index < dates.size(); index++) {
            if (dates.get(index - 1).plusDays(1).equals(dates.get(index))) {
                current++;
                longest = Math.max(longest, current);
            } else {
                current = 1;
            }
        }
        return longest;
    }
}
