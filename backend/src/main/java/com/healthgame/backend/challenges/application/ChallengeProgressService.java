package com.healthgame.backend.challenges.application;

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

    public ChallengeProgressService(
            ChallengeRepository challengeRepository,
            ChallengeTargetRepository challengeTargetRepository,
            ChallengeProgressRepository challengeProgressRepository,
            HabitRepository habitRepository,
            HabitCheckinRepository habitCheckinRepository
    ) {
        this.challengeRepository = challengeRepository;
        this.challengeTargetRepository = challengeTargetRepository;
        this.challengeProgressRepository = challengeProgressRepository;
        this.habitRepository = habitRepository;
        this.habitCheckinRepository = habitCheckinRepository;
    }

    public boolean matchesChallenge(Long challengeId, HabitEntity habit) {
        return challengeTargetRepository.findByChallengeId(challengeId)
                .stream()
                .anyMatch(target -> targetMatchesHabit(target, habit));
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

    private boolean targetMatchesHabit(ChallengeTargetEntity target, HabitEntity habit) {
        return switch (target.getTargetKind()) {
            case "HABIT" -> target.getHabitId() != null && target.getHabitId().equals(habit.getId());
            case "CATEGORY" -> target.getCategoryId() != null && target.getCategoryId().equals(habit.getCategoryId());
            case "UNIT" -> target.getUnit() != null && target.getUnit().equalsIgnoreCase(habit.getUnit());
            default -> false;
        };
    }

    private List<Long> resolveMatchedHabitIds(List<ChallengeTargetEntity> targets, List<HabitEntity> userHabits) {
        Set<Long> matched = new HashSet<>();
        for (ChallengeTargetEntity target : targets) {
            switch (target.getTargetKind()) {
                case "HABIT" -> {
                    if (target.getHabitId() != null && userHabits.stream().anyMatch(habit -> habit.getId().equals(target.getHabitId()))) {
                        matched.add(target.getHabitId());
                    }
                }
                case "CATEGORY" -> userHabits.stream()
                        .filter(habit -> target.getCategoryId() != null && target.getCategoryId().equals(habit.getCategoryId()))
                        .map(HabitEntity::getId)
                        .forEach(matched::add);
                case "UNIT" -> userHabits.stream()
                        .filter(habit -> target.getUnit() != null && target.getUnit().equalsIgnoreCase(habit.getUnit()))
                        .map(HabitEntity::getId)
                        .forEach(matched::add);
                default -> {
                }
            }
        }
        return new ArrayList<>(matched);
    }

    private ProgressSnapshot buildProgressSnapshot(ChallengeEntity challenge, List<HabitCheckinEntity> checkins) {
        int currentValue = switch (challenge.getGoalType()) {
            case "SUM_VALUE" -> checkins.stream().mapToInt(HabitCheckinEntity::getValue).sum();
            case "DAYS_COUNT" -> (int) checkins.stream().map(HabitCheckinEntity::getCheckinDate).distinct().count();
            case "STREAK" -> calculateLongestStreak(checkins.stream().map(HabitCheckinEntity::getCheckinDate).distinct().sorted().toList());
            default -> 0;
        };

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

    private int calculateLongestStreak(List<LocalDate> dates) {
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