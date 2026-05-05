package com.healthgame.backend.challenges.application;

import com.healthgame.backend.challenges.application.progress.ChallengeGoalProgressStrategyFactory;
import com.healthgame.backend.challenges.application.progress.ChallengeTargetMatchingStrategyFactory;
import com.healthgame.backend.challenges.infrastructure.persistence.ChallengeEntity;
import com.healthgame.backend.challenges.infrastructure.persistence.ChallengeProgressEntity;
import com.healthgame.backend.challenges.infrastructure.persistence.ChallengeProgressRepository;
import com.healthgame.backend.challenges.infrastructure.persistence.ChallengeRepository;
import com.healthgame.backend.challenges.infrastructure.persistence.ChallengeTargetEntity;
import com.healthgame.backend.challenges.infrastructure.persistence.ChallengeTargetRepository;
import com.healthgame.backend.habits.infrastructure.persistence.HabitCheckinEntity;
import com.healthgame.backend.habits.infrastructure.persistence.HabitCheckinRepository;
import com.healthgame.backend.habits.infrastructure.persistence.HabitEntity;
import com.healthgame.backend.habits.infrastructure.persistence.HabitRepository;
import com.healthgame.backend.shared.domain.ResourceNotFoundException;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import org.springframework.stereotype.Service;

@Service
public class ChallengeProgressService {

    private final ChallengeRepository challengeRepository;
    private final ChallengeTargetRepository challengeTargetRepository;
    private final ChallengeProgressRepository challengeProgressRepository;
    private final HabitRepository habitRepository;
    private final HabitCheckinRepository habitCheckinRepository;
    private final ChallengeGoalProgressStrategyFactory goalStrategyFactory;
    private final ChallengeTargetMatchingStrategyFactory targetStrategyFactory;

    public ChallengeProgressService(
            ChallengeRepository challengeRepository,
            ChallengeTargetRepository challengeTargetRepository,
            ChallengeProgressRepository challengeProgressRepository,
            HabitRepository habitRepository,
            HabitCheckinRepository habitCheckinRepository,
            ChallengeGoalProgressStrategyFactory goalStrategyFactory,
            ChallengeTargetMatchingStrategyFactory targetStrategyFactory
    ) {
        this.challengeRepository = challengeRepository;
        this.challengeTargetRepository = challengeTargetRepository;
        this.challengeProgressRepository = challengeProgressRepository;
        this.habitRepository = habitRepository;
        this.habitCheckinRepository = habitCheckinRepository;
        this.goalStrategyFactory = goalStrategyFactory;
        this.targetStrategyFactory = targetStrategyFactory;
    }

    public boolean matchesChallenge(Long challengeId, HabitEntity habit) {
        return challengeTargetRepository.findByChallengeId(challengeId)
                .stream()
                .anyMatch(target -> targetStrategyFactory.get(target.getTargetKind()).matches(target, habit));
    }

    public void recalculateProgress(Long challengeId, Long userId) {
        ChallengeEntity challenge = challengeRepository.findById(challengeId)
                .orElseThrow(() -> new ResourceNotFoundException("Challenge was not found"));
        List<ChallengeTargetEntity> targets = challengeTargetRepository.findByChallengeId(challengeId);
        List<HabitEntity> userHabits = habitRepository.findByUserId(userId);
        List<Long> matchedHabitIds = resolveMatchedHabitIds(targets, userHabits);

        ProgressSnapshot snapshot;
        if (matchedHabitIds.isEmpty()) {
            snapshot = new ProgressSnapshot(0, zeroPercent(), null, null);
        } else {
            List<HabitCheckinEntity> relevantCheckins = habitCheckinRepository.findByHabitIdInAndCheckinDateBetween(
                    matchedHabitIds,
                    challenge.getStartDate(),
                    challenge.getEndDate()
            );
            snapshot = buildProgressSnapshot(challenge, relevantCheckins);
        }

        ChallengeProgressEntity progress = challengeProgressRepository.findByChallengeIdAndUserId(challengeId, userId)
                .orElseGet(ChallengeProgressEntity::new);
        progress.setChallengeId(challengeId);
        progress.setUserId(userId);
        progress.setCurrentValue(snapshot.currentValue());
        progress.setCompletionPercent(snapshot.completionPercent());
        progress.setLastCheckinDate(snapshot.lastCheckinDate());
        progress.setCompletedAt(snapshot.completedAt());
        progress.setUpdatedAt(Instant.now());
        challengeProgressRepository.save(progress);
    }

    private List<Long> resolveMatchedHabitIds(List<ChallengeTargetEntity> targets, List<HabitEntity> userHabits) {
        Set<Long> matched = new HashSet<>();
        for (ChallengeTargetEntity target : targets) {
            userHabits.stream()
                    .filter(habit -> targetStrategyFactory.get(target.getTargetKind()).matches(target, habit))
                    .map(HabitEntity::getId)
                    .forEach(matched::add);
        }
        return new ArrayList<>(matched);
    }

    private ProgressSnapshot buildProgressSnapshot(ChallengeEntity challenge, List<HabitCheckinEntity> checkins) {
        String goalType = challenge.getGoalType() == null ? "" : challenge.getGoalType().trim().toUpperCase();
        int currentValue = goalStrategyFactory.get(goalType).calculateCurrentValue(checkins);

        BigDecimal completionPercent = BigDecimal.valueOf(currentValue)
                .multiply(BigDecimal.valueOf(100))
                .divide(BigDecimal.valueOf(challenge.getGoalValue()), 2, RoundingMode.HALF_UP);
        if (completionPercent.compareTo(BigDecimal.valueOf(100)) > 0) {
            completionPercent = BigDecimal.valueOf(100).setScale(2, RoundingMode.HALF_UP);
        }

        LocalDate lastCheckinDate = checkins.stream()
                .map(HabitCheckinEntity::getCheckinDate)
                .max(LocalDate::compareTo)
                .orElse(null);
        Instant completedAt = currentValue >= challenge.getGoalValue()
                ? checkins.stream().map(HabitCheckinEntity::getCreatedAt).max(Instant::compareTo).orElse(Instant.now())
                : null;

        return new ProgressSnapshot(currentValue, completionPercent, lastCheckinDate, completedAt);
    }

    private BigDecimal zeroPercent() {
        return BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
    }

    private record ProgressSnapshot(
            int currentValue,
            BigDecimal completionPercent,
            LocalDate lastCheckinDate,
            Instant completedAt
    ) {
    }
}
