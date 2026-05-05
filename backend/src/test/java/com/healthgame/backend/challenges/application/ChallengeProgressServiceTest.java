package com.healthgame.backend.challenges.application;

import com.healthgame.backend.challenges.application.progress.CategoryTargetMatchingStrategy;
import com.healthgame.backend.challenges.application.progress.ChallengeGoalProgressStrategyFactory;
import com.healthgame.backend.challenges.application.progress.ChallengeTargetMatchingStrategyFactory;
import com.healthgame.backend.challenges.application.progress.DaysCountGoalProgressStrategy;
import com.healthgame.backend.challenges.application.progress.HabitTargetMatchingStrategy;
import com.healthgame.backend.challenges.application.progress.StreakGoalProgressStrategy;
import com.healthgame.backend.challenges.application.progress.SumValueGoalProgressStrategy;
import com.healthgame.backend.challenges.application.progress.UnitTargetMatchingStrategy;
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
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Captor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ChallengeProgressServiceTest {

    @Mock
    private ChallengeRepository challengeRepository;

    @Mock
    private ChallengeTargetRepository challengeTargetRepository;

    @Mock
    private ChallengeProgressRepository challengeProgressRepository;

    @Mock
    private HabitRepository habitRepository;

    @Mock
    private HabitCheckinRepository habitCheckinRepository;

    @Captor
    private ArgumentCaptor<ChallengeProgressEntity> progressCaptor;

    private ChallengeProgressService challengeProgressService;

    @BeforeEach
    void setUp() {
        ChallengeGoalProgressStrategyFactory goalFactory = new ChallengeGoalProgressStrategyFactory(
                List.of(new DaysCountGoalProgressStrategy(), new StreakGoalProgressStrategy(), new SumValueGoalProgressStrategy())
        );
        ChallengeTargetMatchingStrategyFactory targetFactory = new ChallengeTargetMatchingStrategyFactory(
                List.of(new HabitTargetMatchingStrategy(), new CategoryTargetMatchingStrategy(), new UnitTargetMatchingStrategy())
        );
        challengeProgressService = new ChallengeProgressService(
                challengeRepository,
                challengeTargetRepository,
                challengeProgressRepository,
                habitRepository,
                habitCheckinRepository,
                goalFactory,
                targetFactory
        );
    }

    @Test
    void matchesChallengeReturnsTrueWhenAnyTargetMatches() {
        ChallengeTargetEntity target = new ChallengeTargetEntity();
        target.setTargetKind("UNIT");
        target.setUnit("ml");

        HabitEntity habit = new HabitEntity();
        ReflectionTestUtils.setField(habit, "id", 3L);
        habit.setUnit("ML");

        when(challengeTargetRepository.findByChallengeId(5L)).thenReturn(List.of(target));

        assertThat(challengeProgressService.matchesChallenge(5L, habit)).isTrue();
    }

    @Test
    void recalculateProgressStoresCompletedSnapshotAndCapsPercent() {
        ChallengeEntity challenge = new ChallengeEntity();
        ReflectionTestUtils.setField(challenge, "id", 10L);
        challenge.setGoalType("SUM_VALUE");
        challenge.setGoalValue(5);
        challenge.setStartDate(LocalDate.parse("2026-05-01"));
        challenge.setEndDate(LocalDate.parse("2026-05-10"));

        ChallengeTargetEntity target = new ChallengeTargetEntity();
        target.setTargetKind("CATEGORY");
        target.setCategoryId(2);

        HabitEntity matchedHabit = new HabitEntity();
        ReflectionTestUtils.setField(matchedHabit, "id", 11L);
        matchedHabit.setCategoryId(2);

        HabitEntity ignoredHabit = new HabitEntity();
        ReflectionTestUtils.setField(ignoredHabit, "id", 12L);
        ignoredHabit.setCategoryId(3);

        HabitCheckinEntity first = new HabitCheckinEntity();
        first.setHabitId(11L);
        first.setCheckinDate(LocalDate.parse("2026-05-02"));
        first.setValue(3);
        first.setCreatedAt(Instant.parse("2026-05-02T08:00:00Z"));

        HabitCheckinEntity second = new HabitCheckinEntity();
        second.setHabitId(11L);
        second.setCheckinDate(LocalDate.parse("2026-05-04"));
        second.setValue(4);
        second.setCreatedAt(Instant.parse("2026-05-04T09:30:00Z"));

        when(challengeRepository.findById(10L)).thenReturn(Optional.of(challenge));
        when(challengeTargetRepository.findByChallengeId(10L)).thenReturn(List.of(target));
        when(habitRepository.findByUserId(77L)).thenReturn(List.of(matchedHabit, ignoredHabit));
        when(habitCheckinRepository.findByHabitIdInAndCheckinDateBetween(List.of(11L), challenge.getStartDate(), challenge.getEndDate()))
                .thenReturn(List.of(first, second));
        when(challengeProgressRepository.findByChallengeIdAndUserId(10L, 77L)).thenReturn(Optional.empty());

        challengeProgressService.recalculateProgress(10L, 77L);

        verify(challengeProgressRepository).save(progressCaptor.capture());
        ChallengeProgressEntity saved = progressCaptor.getValue();
        assertThat(saved.getCurrentValue()).isEqualTo(7);
        assertThat(saved.getCompletionPercent()).isEqualByComparingTo(new BigDecimal("100.00"));
        assertThat(saved.getLastCheckinDate()).isEqualTo(LocalDate.parse("2026-05-04"));
        assertThat(saved.getCompletedAt()).isEqualTo(Instant.parse("2026-05-04T09:30:00Z"));
    }

    @Test
    void recalculateProgressStoresZeroSnapshotWhenNoHabitsMatchTargets() {
        ChallengeEntity challenge = new ChallengeEntity();
        ReflectionTestUtils.setField(challenge, "id", 15L);
        challenge.setGoalType("DAYS_COUNT");
        challenge.setGoalValue(3);
        challenge.setStartDate(LocalDate.parse("2026-05-01"));
        challenge.setEndDate(LocalDate.parse("2026-05-10"));

        ChallengeTargetEntity target = new ChallengeTargetEntity();
        target.setTargetKind("HABIT");
        target.setHabitId(999L);

        HabitEntity userHabit = new HabitEntity();
        ReflectionTestUtils.setField(userHabit, "id", 11L);

        when(challengeRepository.findById(15L)).thenReturn(Optional.of(challenge));
        when(challengeTargetRepository.findByChallengeId(15L)).thenReturn(List.of(target));
        when(habitRepository.findByUserId(5L)).thenReturn(List.of(userHabit));
        when(challengeProgressRepository.findByChallengeIdAndUserId(15L, 5L)).thenReturn(Optional.empty());

        challengeProgressService.recalculateProgress(15L, 5L);

        verify(challengeProgressRepository).save(progressCaptor.capture());
        ChallengeProgressEntity saved = progressCaptor.getValue();
        assertThat(saved.getCurrentValue()).isZero();
        assertThat(saved.getCompletionPercent()).isEqualByComparingTo(new BigDecimal("0.00"));
        assertThat(saved.getLastCheckinDate()).isNull();
        assertThat(saved.getCompletedAt()).isNull();
    }
}
