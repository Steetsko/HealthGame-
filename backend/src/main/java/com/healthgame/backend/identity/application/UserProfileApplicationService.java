package com.healthgame.backend.identity.application;

import com.healthgame.backend.achievements.infrastructure.persistence.UserAchievementRepository;
import com.healthgame.backend.achievements.application.AchievementApplicationService;
import com.healthgame.backend.challenges.infrastructure.persistence.ChallengeEntity;
import com.healthgame.backend.challenges.infrastructure.persistence.ChallengeParticipantEntity;
import com.healthgame.backend.challenges.infrastructure.persistence.ChallengeParticipantRepository;
import com.healthgame.backend.challenges.infrastructure.persistence.ChallengeRepository;
import com.healthgame.backend.habits.infrastructure.persistence.HabitCheckinEntity;
import com.healthgame.backend.habits.infrastructure.persistence.HabitCheckinRepository;
import com.healthgame.backend.habits.infrastructure.persistence.HabitEntity;
import com.healthgame.backend.habits.infrastructure.persistence.HabitRepository;
import com.healthgame.backend.habits.infrastructure.persistence.HabitScheduleEntity;
import com.healthgame.backend.habits.infrastructure.persistence.HabitScheduleRepository;
import com.healthgame.backend.identity.infrastructure.persistence.UserEntity;
import com.healthgame.backend.identity.infrastructure.persistence.UserRepository;
import com.healthgame.backend.identity.infrastructure.persistence.UserRoleJdbcRepository;
import com.healthgame.backend.identity.infrastructure.security.AuthenticatedUser;
import com.healthgame.backend.shared.domain.ConflictException;
import com.healthgame.backend.shared.domain.ResourceNotFoundException;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneId;
import java.time.Instant;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;

@Service
public class UserProfileApplicationService {

    private final UserRepository userRepository;
    private final UserRoleJdbcRepository userRoleJdbcRepository;
    private final HabitRepository habitRepository;
    private final HabitScheduleRepository habitScheduleRepository;
    private final HabitCheckinRepository habitCheckinRepository;
    private final ChallengeParticipantRepository challengeParticipantRepository;
    private final ChallengeRepository challengeRepository;
    private final UserAchievementRepository userAchievementRepository;
    private final AchievementApplicationService achievementApplicationService;

    public UserProfileApplicationService(
            UserRepository userRepository,
            UserRoleJdbcRepository userRoleJdbcRepository,
            HabitRepository habitRepository,
            HabitScheduleRepository habitScheduleRepository,
            HabitCheckinRepository habitCheckinRepository,
            ChallengeParticipantRepository challengeParticipantRepository,
            ChallengeRepository challengeRepository,
            UserAchievementRepository userAchievementRepository,
            AchievementApplicationService achievementApplicationService
    ) {
        this.userRepository = userRepository;
        this.userRoleJdbcRepository = userRoleJdbcRepository;
        this.habitRepository = habitRepository;
        this.habitScheduleRepository = habitScheduleRepository;
        this.habitCheckinRepository = habitCheckinRepository;
        this.challengeParticipantRepository = challengeParticipantRepository;
        this.challengeRepository = challengeRepository;
        this.userAchievementRepository = userAchievementRepository;
        this.achievementApplicationService = achievementApplicationService;
    }

    public CurrentUserResponse getCurrentUser(AuthenticatedUser authenticatedUser) {
        UserEntity user = getUser(authenticatedUser);
        return toResponse(user);
    }

    public DashboardSummaryResponse getDashboardSummary(AuthenticatedUser authenticatedUser) {
        UserEntity user = getUser(authenticatedUser);
        ZoneId zoneId = ZoneId.of(user.getTimezone());
        LocalDate today = LocalDate.now(zoneId);
        LocalDate weekStart = today.minusDays(6);
        LocalDate streakStart = today.minusDays(29);

        List<HabitEntity> habits = habitRepository.findByUserIdAndActiveTrue(user.getId());
        if (habits.isEmpty()) {
            int activeChallenges = (int) challengeParticipantRepository.countByUserIdAndParticipantStatus(user.getId(), "ACCEPTED");
            long achievements = userAchievementRepository.countByUserId(user.getId());
            int xp = (int) (achievements * 50L + activeChallenges * 25L);
            int level = levelFromXp(xp);
            achievementApplicationService.awardLevelMilestones(user.getId(), level);
            return new DashboardSummaryResponse(
                    level,
                    xp,
                    nextLevelXp(xp),
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    activeChallenges,
                    "Добавьте первую привычку, чтобы запустить личный ритм и начать копить XP."
            );
        }

        List<Long> habitIds = habits.stream().map(HabitEntity::getId).toList();
        Map<Long, List<HabitScheduleEntity>> schedulesByHabit = habitScheduleRepository.findByHabitIdIn(habitIds)
                .stream()
                .filter(HabitScheduleEntity::isEnabled)
                .collect(Collectors.groupingBy(HabitScheduleEntity::getHabitId));

        Map<Long, Map<LocalDate, HabitCheckinEntity>> checkinsByHabit = habitCheckinRepository
                .findByHabitIdInAndCheckinDateBetween(habitIds, streakStart, today)
                .stream()
                .collect(Collectors.groupingBy(
                        HabitCheckinEntity::getHabitId,
                        Collectors.toMap(HabitCheckinEntity::getCheckinDate, Function.identity(), (left, right) -> right, HashMap::new)
                ));

        DayProgress todayProgress = calculateDayProgress(habits, schedulesByHabit, checkinsByHabit, today);

        int weeklyPlanned = 0;
        int weeklyCompleted = 0;
        for (LocalDate date = weekStart; !date.isAfter(today); date = date.plusDays(1)) {
            DayProgress progress = calculateDayProgress(habits, schedulesByHabit, checkinsByHabit, date);
            weeklyPlanned += progress.planned();
            weeklyCompleted += progress.completed();
        }

        int streakDays = 0;
        for (LocalDate date = today; !date.isBefore(streakStart); date = date.minusDays(1)) {
            DayProgress progress = calculateDayProgress(habits, schedulesByHabit, checkinsByHabit, date);
            if (progress.planned() == 0) {
                continue;
            }
            if (progress.completed() < progress.planned()) {
                break;
            }
            streakDays++;
        }

        int activeChallenges = (int) challengeParticipantRepository.countByUserIdAndParticipantStatus(user.getId(), "ACCEPTED");
        long achievements = userAchievementRepository.countByUserId(user.getId());
        int totalCheckins = habitCheckinRepository.findByHabitIdInAndCheckinDateBetween(habitIds, streakStart.minusYears(20), today).size();
        int dailyScore = todayProgress.planned() == 0 ? 0 : Math.round((todayProgress.completed() * 100f) / todayProgress.planned());
        int weeklyProgressPercent = weeklyPlanned == 0 ? 0 : Math.round((weeklyCompleted * 100f) / weeklyPlanned);
        int xp = totalCheckins * 10 + (int) achievements * 50 + activeChallenges * 25 + (streakDays / 7) * 40;
        int level = levelFromXp(xp);
        achievementApplicationService.awardLevelMilestones(user.getId(), level);

        return new DashboardSummaryResponse(
                level,
                xp,
                nextLevelXp(xp),
                dailyScore,
                streakDays,
                todayProgress.completed(),
                todayProgress.planned(),
                weeklyCompleted,
                weeklyPlanned,
                weeklyProgressPercent,
                activeChallenges,
                buildInsight(habits, schedulesByHabit, checkinsByHabit, today, streakDays, dailyScore)
        );
    }

    public CurrentUserResponse updateCurrentUser(AuthenticatedUser authenticatedUser, UpdateCurrentUserRequest request) {
        UserEntity user = getUser(authenticatedUser);

        String normalizedEmail = request.email().trim().toLowerCase();
        String normalizedNickname = request.nickname().trim();

        userRepository.findByEmailIgnoreCase(normalizedEmail)
                .filter(existing -> !existing.getId().equals(user.getId()))
                .ifPresent(existing -> { throw new ConflictException("Email is already registered"); });

        userRepository.findByNicknameIgnoreCase(normalizedNickname)
                .filter(existing -> !existing.getId().equals(user.getId()))
                .ifPresent(existing -> { throw new ConflictException("Nickname is already registered"); });

        user.setEmail(normalizedEmail);
        user.setNickname(normalizedNickname);
        user.setPhone(request.phone().trim());
        user.setFirstName(request.firstName().trim());
        user.setTimezone(request.timezone().trim());
        user.setAvatarUrl(blankToNull(request.avatarUrl()));

        return toResponse(userRepository.save(user));
    }

    public PublicUserProfileResponse getPublicUserProfile(Long userId) {
        UserEntity user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User was not found"));

        UserRhythmSummary rhythmSummary = calculateUserRhythmSummary(user);
        List<PublicUserChallengeResponse> challengeHistory = loadPublicChallengeHistory(userId);

        return new PublicUserProfileResponse(
                user.getId(),
                user.getNickname(),
                user.getFirstName(),
                user.getAvatarUrl(),
                user.getTimezone(),
                user.getStatus(),
                user.getRegisteredAt(),
                habitRepository.countByUserIdAndActiveTrue(userId),
                challengeParticipantRepository.countByUserIdAndParticipantStatus(userId, "ACCEPTED"),
                userAchievementRepository.countByUserId(userId),
                rhythmSummary.level(),
                rhythmSummary.xp(),
                rhythmSummary.nextLevelXp(),
                rhythmSummary.streakDays(),
                rhythmSummary.totalCheckins(),
                challengeHistory
        );
    }

    private UserRhythmSummary calculateUserRhythmSummary(UserEntity user) {
        ZoneId zoneId = ZoneId.of(user.getTimezone());
        LocalDate today = LocalDate.now(zoneId);
        LocalDate streakStart = today.minusDays(29);

        List<HabitEntity> habits = habitRepository.findByUserIdAndActiveTrue(user.getId());
        if (habits.isEmpty()) {
            int activeChallenges = (int) challengeParticipantRepository.countByUserIdAndParticipantStatus(user.getId(), "ACCEPTED");
            long achievements = userAchievementRepository.countByUserId(user.getId());
            int xp = (int) (achievements * 50L + activeChallenges * 25L);
            return new UserRhythmSummary(levelFromXp(xp), xp, nextLevelXp(xp), 0, 0);
        }

        List<Long> habitIds = habits.stream().map(HabitEntity::getId).toList();
        Map<Long, List<HabitScheduleEntity>> schedulesByHabit = habitScheduleRepository.findByHabitIdIn(habitIds)
                .stream()
                .filter(HabitScheduleEntity::isEnabled)
                .collect(Collectors.groupingBy(HabitScheduleEntity::getHabitId));

        Map<Long, Map<LocalDate, HabitCheckinEntity>> checkinsByHabit = habitCheckinRepository
                .findByHabitIdInAndCheckinDateBetween(habitIds, streakStart, today)
                .stream()
                .collect(Collectors.groupingBy(
                        HabitCheckinEntity::getHabitId,
                        Collectors.toMap(HabitCheckinEntity::getCheckinDate, Function.identity(), (left, right) -> right, HashMap::new)
                ));

        int streakDays = 0;
        for (LocalDate date = today; !date.isBefore(streakStart); date = date.minusDays(1)) {
            DayProgress progress = calculateDayProgress(habits, schedulesByHabit, checkinsByHabit, date);
            if (progress.planned() == 0) {
                continue;
            }
            if (progress.completed() < progress.planned()) {
                break;
            }
            streakDays++;
        }

        int activeChallenges = (int) challengeParticipantRepository.countByUserIdAndParticipantStatus(user.getId(), "ACCEPTED");
        long achievements = userAchievementRepository.countByUserId(user.getId());
        int totalCheckins = habitCheckinRepository.findByHabitIdInAndCheckinDateBetween(habitIds, streakStart.minusYears(20), today).size();
        int xp = totalCheckins * 10 + (int) achievements * 50 + activeChallenges * 25 + (streakDays / 7) * 40;
        return new UserRhythmSummary(levelFromXp(xp), xp, nextLevelXp(xp), streakDays, totalCheckins);
    }

    private List<PublicUserChallengeResponse> loadPublicChallengeHistory(Long userId) {
        List<ChallengeParticipantEntity> participations = challengeParticipantRepository.findByUserId(userId).stream()
                .filter(participant -> !"INVITED".equals(participant.getParticipantStatus()))
                .filter(participant -> !"DECLINED".equals(participant.getParticipantStatus()))
                .toList();
        if (participations.isEmpty()) {
            return List.of();
        }

        Map<Long, ChallengeParticipantEntity> participationByChallengeId = participations.stream()
                .collect(Collectors.toMap(ChallengeParticipantEntity::getChallengeId, Function.identity(), (left, right) -> {
                    Instant leftMoment = left.getRespondedAt() != null ? left.getRespondedAt() : left.getJoinedAt();
                    Instant rightMoment = right.getRespondedAt() != null ? right.getRespondedAt() : right.getJoinedAt();
                    return Comparator.nullsLast(Instant::compareTo).compare(leftMoment, rightMoment) >= 0 ? left : right;
                }));

        List<Long> challengeIds = participationByChallengeId.keySet().stream().toList();
        Map<Long, ChallengeEntity> challenges = challengeRepository.findAllById(challengeIds).stream()
                .filter(ChallengeEntity::isPublic)
                .filter(challenge -> "VISIBLE".equals(challenge.getModerationStatus()))
                .collect(Collectors.toMap(ChallengeEntity::getId, Function.identity()));
        if (challenges.isEmpty()) {
            return List.of();
        }

        Map<Long, Integer> participantCounts = challengeParticipantRepository.findByChallengeIdIn(challenges.keySet().stream().toList()).stream()
                .filter(participant -> "ACCEPTED".equals(participant.getParticipantStatus()))
                .collect(Collectors.groupingBy(
                        ChallengeParticipantEntity::getChallengeId,
                        Collectors.collectingAndThen(Collectors.counting(), Math::toIntExact)
                ));

        return challenges.values().stream()
                .map(challenge -> {
                    ChallengeParticipantEntity participant = participationByChallengeId.get(challenge.getId());
                    return new PublicUserChallengeResponse(
                            challenge.getId(),
                            challenge.getName(),
                            challenge.getDescription(),
                            challenge.getStatus(),
                            participant.getParticipantStatus(),
                            participant.getParticipantRole(),
                            challenge.getStartDate(),
                            challenge.getEndDate(),
                            challenge.getGoalValue(),
                            participantCounts.getOrDefault(challenge.getId(), 0),
                            challenge.getCoverImageUrl(),
                            participant.getJoinedAt()
                    );
                })
                .sorted(Comparator
                        .comparing((PublicUserChallengeResponse item) -> "ACTIVE".equals(item.status()) ? 0 : 1)
                        .thenComparing(PublicUserChallengeResponse::endDate, Comparator.nullsLast(Comparator.reverseOrder()))
                        .thenComparing(PublicUserChallengeResponse::joinedAt, Comparator.nullsLast(Comparator.reverseOrder())))
                .toList();
    }

    private UserEntity getUser(AuthenticatedUser authenticatedUser) {
        return userRepository.findById(authenticatedUser.userId())
                .orElseThrow(() -> new ResourceNotFoundException("Authenticated user was not found"));
    }

    private CurrentUserResponse toResponse(UserEntity user) {
        List<String> roles = userRoleJdbcRepository.findRoleCodesByUserId(user.getId());
        return new CurrentUserResponse(
                user.getId(),
                user.getEmail(),
                user.getPhone(),
                user.getNickname(),
                user.getFirstName(),
                user.getAvatarUrl(),
                user.getTimezone(),
                user.getStatus(),
                user.getRegisteredAt(),
                user.getLastLoginAt(),
                roles
        );
    }

    private DayProgress calculateDayProgress(
            List<HabitEntity> habits,
            Map<Long, List<HabitScheduleEntity>> schedulesByHabit,
            Map<Long, Map<LocalDate, HabitCheckinEntity>> checkinsByHabit,
            LocalDate date
    ) {
        int planned = 0;
        int completed = 0;
        for (HabitEntity habit : habits) {
            if (!isHabitScheduledOn(date, habit, schedulesByHabit.getOrDefault(habit.getId(), List.of()))) {
                continue;
            }
            planned++;
            if (checkinsByHabit.getOrDefault(habit.getId(), Map.of()).containsKey(date)) {
                completed++;
            }
        }
        return new DayProgress(planned, completed);
    }

    private boolean isHabitScheduledOn(LocalDate date, HabitEntity habit, List<HabitScheduleEntity> schedules) {
        if (date.isBefore(habit.getStartDate()) || (habit.getEndDate() != null && date.isAfter(habit.getEndDate()))) {
            return false;
        }
        if (schedules.isEmpty()) {
            return true;
        }
        int dayOfWeek = date.getDayOfWeek().getValue();
        if ("DAILY".equals(habit.getFrequency())) {
            return schedules.stream().anyMatch(schedule -> schedule.getDayOfWeek() == null || schedule.getDayOfWeek().intValue() == dayOfWeek);
        }
        return schedules.stream().anyMatch(schedule -> schedule.getDayOfWeek() != null && schedule.getDayOfWeek().intValue() == dayOfWeek);
    }

    private String buildInsight(
            List<HabitEntity> habits,
            Map<Long, List<HabitScheduleEntity>> schedulesByHabit,
            Map<Long, Map<LocalDate, HabitCheckinEntity>> checkinsByHabit,
            LocalDate today,
            int streakDays,
            int dailyScore
    ) {
        LocalDate analysisStart = today.minusDays(13);
        int morningPlanned = 0;
        int morningCompleted = 0;
        int eveningPlanned = 0;
        int eveningCompleted = 0;

        for (LocalDate date = analysisStart; !date.isAfter(today); date = date.plusDays(1)) {
            for (HabitEntity habit : habits) {
                List<HabitScheduleEntity> schedules = schedulesByHabit.getOrDefault(habit.getId(), List.of());
                if (!isHabitScheduledOn(date, habit, schedules)) {
                    continue;
                }
                LocalTime plannedTime = schedules.stream()
                        .map(HabitScheduleEntity::getTimeOfDay)
                        .filter(java.util.Objects::nonNull)
                        .findFirst()
                        .orElse(LocalTime.of(9, 0));
                boolean completed = checkinsByHabit.getOrDefault(habit.getId(), Map.of()).containsKey(date);
                if (plannedTime.isBefore(LocalTime.NOON)) {
                    morningPlanned++;
                    if (completed) morningCompleted++;
                } else {
                    eveningPlanned++;
                    if (completed) eveningCompleted++;
                }
            }
        }

        double morningRate = morningPlanned == 0 ? 1.0 : (double) morningCompleted / morningPlanned;
        double eveningRate = eveningPlanned == 0 ? 1.0 : (double) eveningCompleted / eveningPlanned;

        if (morningPlanned >= 4 && morningRate + 0.12 < eveningRate) {
            return "Утренние привычки проседают чаще. Попробуйте сдвинуть их на первый свободный час после старта дня.";
        }
        if (streakDays >= 7) {
            return "Серия держится уже " + streakDays + " дней. Самое время добавить одну привычку посильнее и забрать бонусный XP.";
        }
        if (dailyScore >= 100) {
            return "День закрыт идеально. Сохраните этот ритм и серия начнет работать на вас.";
        }
        return "Лучший рост сейчас дает стабильное закрытие плана дня. Начните с одной быстрой привычки и соберите первый чистый день.";
    }

    private int levelFromXp(int xp) {
        return xp / 120 + 1;
    }

    private int nextLevelXp(int xp) {
        int level = levelFromXp(xp);
        return level * 120;
    }

    private String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    private record DayProgress(int planned, int completed) {
    }

    private record UserRhythmSummary(
            int level,
            int xp,
            int nextLevelXp,
            int streakDays,
            int totalCheckins
    ) {
    }
}
