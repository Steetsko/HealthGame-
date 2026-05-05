package com.healthgame.backend.challenges.application.progress;

import com.healthgame.backend.shared.domain.ConflictException;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.stereotype.Component;

@Component
public class ChallengeTargetMatchingStrategyFactory {

    private final Map<String, ChallengeTargetMatchingStrategy> strategies;

    public ChallengeTargetMatchingStrategyFactory(List<ChallengeTargetMatchingStrategy> strategies) {
        this.strategies = strategies.stream().collect(Collectors.toMap(ChallengeTargetMatchingStrategy::supportedTargetKind, Function.identity()));
    }

    public ChallengeTargetMatchingStrategy get(String targetKind) {
        if (targetKind == null || targetKind.isBlank()) {
            throw new ConflictException("Challenge target kind is required");
        }
        String key = targetKind.trim().toUpperCase();
        ChallengeTargetMatchingStrategy strategy = strategies.get(key);
        if (strategy == null) {
            throw new ConflictException("Unsupported challenge target kind: " + targetKind);
        }
        return strategy;
    }
}
