package com.healthgame.backend.challenges.application.progress;

import com.healthgame.backend.shared.domain.ConflictException;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.stereotype.Component;

@Component
public class ChallengeGoalProgressStrategyFactory {

    private final Map<String, ChallengeGoalProgressStrategy> strategies;

    public ChallengeGoalProgressStrategyFactory(List<ChallengeGoalProgressStrategy> strategies) {
        this.strategies = strategies.stream().collect(Collectors.toMap(ChallengeGoalProgressStrategy::supportedGoalType, Function.identity()));
    }

    public ChallengeGoalProgressStrategy get(String goalType) {
        if (goalType == null || goalType.isBlank()) {
            throw new ConflictException("Challenge goal type is required");
        }
        String key = goalType.trim().toUpperCase();
        ChallengeGoalProgressStrategy strategy = strategies.get(key);
        if (strategy == null) {
            throw new ConflictException("Unsupported challenge goal type: " + goalType);
        }
        return strategy;
    }
}
