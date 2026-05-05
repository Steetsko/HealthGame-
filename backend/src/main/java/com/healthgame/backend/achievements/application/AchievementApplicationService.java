package com.healthgame.backend.achievements.application;

import com.healthgame.backend.achievements.infrastructure.persistence.AchievementEntity;
import com.healthgame.backend.achievements.infrastructure.persistence.AchievementRepository;
import com.healthgame.backend.achievements.infrastructure.persistence.UserAchievementEntity;
import com.healthgame.backend.achievements.infrastructure.persistence.UserAchievementRepository;
import com.healthgame.backend.challenges.infrastructure.persistence.ChallengeProgressRepository;
import com.healthgame.backend.challenges.infrastructure.persistence.ChallengeParticipantRepository;
import com.healthgame.backend.community.infrastructure.persistence.CommentRepository;
import com.healthgame.backend.community.infrastructure.persistence.PostReactionRepository;
import com.healthgame.backend.community.infrastructure.persistence.PostRepository;
import com.healthgame.backend.habits.infrastructure.persistence.HabitCategoryEntity;
import com.healthgame.backend.habits.infrastructure.persistence.HabitCategoryRepository;
import com.healthgame.backend.habits.infrastructure.persistence.HabitCheckinEntity;
import com.healthgame.backend.habits.infrastructure.persistence.HabitCheckinRepository;
import com.healthgame.backend.habits.infrastructure.persistence.HabitEntity;
import com.healthgame.backend.habits.infrastructure.persistence.HabitRepository;
import com.healthgame.backend.identity.infrastructure.security.AuthenticatedUser;
import com.healthgame.backend.notifications.application.NotificationApplicationService;
import com.healthgame.backend.shared.domain.ResourceNotFoundException;
import jakarta.transaction.Transactional;
import java.time.Instant;
import java.time.LocalDate;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;

@Service
public class AchievementApplicationService {

    private final AchievementRepository achievementRepository;
    private final UserAchievementRepository userAchievementRepository;
    private final CommentRepository commentRepository;
    private final PostRepository postRepository;
    private final PostReactionRepository postReactionRepository;
    private final HabitRepository habitRepository;
    private final HabitCategoryRepository habitCategoryRepository;
    private final HabitCheckinRepository habitCheckinRepository;
    private final ChallengeProgressRepository challengeProgressRepository;
    private final ChallengeParticipantRepository challengeParticipantRepository;
    private final NotificationApplicationService notificationApplicationService;

    public AchievementApplicationService(
            AchievementRepository achievementRepository,
            UserAchievementRepository userAchievementRepository,
            CommentRepository commentRepository,
            PostRepository postRepository,
            PostReactionRepository postReactionRepository,
            HabitRepository habitRepository,
            HabitCategoryRepository habitCategoryRepository,
            HabitCheckinRepository habitCheckinRepository,
            ChallengeProgressRepository challengeProgressRepository,
            ChallengeParticipantRepository challengeParticipantRepository,
            NotificationApplicationService notificationApplicationService
    ) {
        this.achievementRepository = achievementRepository;
        this.userAchievementRepository = userAchievementRepository;
        this.commentRepository = commentRepository;
        this.postRepository = postRepository;
        this.postReactionRepository = postReactionRepository;
        this.habitRepository = habitRepository;
        this.habitCategoryRepository = habitCategoryRepository;
        this.habitCheckinRepository = habitCheckinRepository;
        this.challengeProgressRepository = challengeProgressRepository;
        this.challengeParticipantRepository = challengeParticipantRepository;
        this.notificationApplicationService = notificationApplicationService;
    }

    public List<AchievementResponse> getMyAchievements(AuthenticatedUser authenticatedUser) {
        Long userId = authenticatedUser.userId();
        List<AchievementEntity> catalog = achievementRepository.findAllByActiveTrueOrderByIdAsc();
        List<UserAchievementEntity> awards = userAchievementRepository.findByUserIdOrderByAwardedAtDesc(userId);
        Map<Integer, UserAchievementEntity> awardByAchievementId = awards.stream()
                .collect(Collectors.toMap(UserAchievementEntity::getAchievementId, Function.identity()));

        Comparator<AchievementResponse> boardOrder = Comparator
                .comparing((AchievementResponse row) -> Boolean.TRUE.equals(row.unlocked()) ? 0 : 1)
                .thenComparing(
                        AchievementResponse::awardedAt,
                        Comparator.nullsLast(Comparator.<Instant>naturalOrder()).reversed())
                .thenComparing(AchievementResponse::id, Comparator.nullsLast(Integer::compareTo));

        return catalog.stream()
                .map(achievement -> {
                    UserAchievementEntity award = awardByAchievementId.get(achievement.getId());
                    boolean unlocked = award != null;
                    Instant awardedAt = unlocked ? award.getAwardedAt() : null;
                    return new AchievementResponse(
                            achievement.getId(),
                            achievement.getCode(),
                            achievement.getName(),
                            achievement.getName(),
                            achievement.getDescription(),
                            achievement.getIcon(),
                            achievement.getRarity(),
                            unlocked,
                            awardedAt,
                            awardedAt,
                            unlocked ? award.getSource() : null,
                            null,
                            null,
                            unlocked ? award.getId() : null
                    );
                })
                .sorted(boardOrder)
                .toList();
    }

    @Transactional
    public void awardFirstCheckin(Long userId) {
        awardByCodeIfAbsent(userId, "FIRST_CHECKIN", "HABIT");
    }

    @Transactional
    public void awardChallengeJoiner(Long userId) {
        awardByCodeIfAbsent(userId, "CHALLENGE_JOINER", "CHALLENGE");
        refreshChallengeMilestones(userId);
    }

    @Transactional
    public void awardFirstComment(Long userId) {
        if (commentRepository.countByAuthorId(userId) >= 1) {
            awardByCodeIfAbsent(userId, "FIRST_COMMENT", "COMMUNITY");
        }
    }

    @Transactional
    public void awardChallengeCreator(Long userId) {
        awardByCodeIfAbsent(userId, "CHALLENGE_CREATOR", "CHALLENGE");
        refreshChallengeMilestones(userId);
    }

    @Transactional
    public void awardLevelMilestones(Long userId, int level) {
        if (level >= 10) {
            awardByCodeIfAbsent(userId, "LEVEL_GREEN", "HABIT");
        }
        if (level >= 11) {
            awardByCodeIfAbsent(userId, "LEVEL_YELLOW", "HABIT");
        }
        if (level >= 31) {
            awardByCodeIfAbsent(userId, "LEVEL_ORANGE", "HABIT");
        }
        if (level >= 51) {
            awardByCodeIfAbsent(userId, "LEVEL_RED", "HABIT");
        }
    }

    @Transactional
    public void awardFirstPost(Long userId) {
        if (postRepository.countByAuthorId(userId) >= 1) {
            awardByCodeIfAbsent(userId, "FIRST_POST", "COMMUNITY");
        }
    }

    @Transactional
    public void awardFirstReaction(Long userId) {
        if (postReactionRepository.countByUserId(userId) >= 1) {
            awardByCodeIfAbsent(userId, "FIRST_REACTION", "COMMUNITY");
        }
    }

    @Transactional
    public void awardChallengeCompletion(Long userId) {
        awardByCodeIfAbsent(userId, "CHALLENGE_FINISHER", "CHALLENGE");
        refreshChallengeMilestones(userId);
    }

    @Transactional
    public void refreshHabitMilestones(Long userId) {
        List<HabitEntity> habits = habitRepository.findByUserId(userId);
        if (habits.isEmpty()) {
            return;
        }

        List<Long> habitIds = habits.stream().map(HabitEntity::getId).toList();
        long totalCheckins = habitCheckinRepository.countByHabitIdIn(habitIds);
        if (totalCheckins >= 3) {
            awardByCodeIfAbsent(userId, "HABIT_ROOKIE", "HABIT");
        }
        if (totalCheckins >= 10) {
            awardByCodeIfAbsent(userId, "STEADY_RHYTHM", "HABIT");
        }

        Set<Integer> waterCategoryIds = habits.stream()
                .filter(this::isWaterHabit)
                .map(HabitEntity::getCategoryId)
                .collect(Collectors.toSet());
        List<Long> waterHabitIds = habits.stream()
                .filter(habit -> waterCategoryIds.contains(habit.getCategoryId()))
                .map(HabitEntity::getId)
                .toList();
        if (!waterHabitIds.isEmpty() && habitCheckinRepository.countByHabitIdIn(waterHabitIds) >= 3) {
            awardByCodeIfAbsent(userId, "WATER_START", "HABIT");
        }

        if (calculateCurrentStreakDays(habitCheckinRepository.findByHabitIdInOrderByCheckinDateDesc(habitIds)) >= 7) {
            awardByCodeIfAbsent(userId, "HABIT_STRENGTH", "HABIT");
        }
    }

    @Transactional
    public void refreshChallengeMilestones(Long userId) {
        long acceptedChallenges = challengeParticipantRepository.countByUserIdAndParticipantStatus(userId, "ACCEPTED");
        if (acceptedChallenges >= 3) {
            awardByCodeIfAbsent(userId, "CHALLENGE_TRAVELER", "CHALLENGE");
        }
        if (acceptedChallenges >= 10) {
            awardByCodeIfAbsent(userId, "CHALLENGE_VETERAN", "CHALLENGE");
        }
        if (challengeProgressRepository.countByUserIdAndCompletedAtIsNotNull(userId) >= 3) {
            awardByCodeIfAbsent(userId, "TEAM_PACE", "CHALLENGE");
        }
    }

    private void awardByCodeIfAbsent(Long userId, String code, String source) {
        AchievementEntity achievement = achievementRepository.findByCode(code)
                .orElseThrow(() -> new ResourceNotFoundException("Achievement seed was not found: " + code));
        if (userAchievementRepository.findByUserIdAndAchievementId(userId, achievement.getId()).isPresent()) {
            return;
        }
        UserAchievementEntity entity = new UserAchievementEntity();
        entity.setUserId(userId);
        entity.setAchievementId(achievement.getId());
        entity.setAwardedAt(Instant.now());
        entity.setSource(source);
        userAchievementRepository.save(entity);
        notificationApplicationService.notifyAchievementUnlocked(userId, achievement.getName(), "/dashboard");
    }

    private boolean isWaterHabit(HabitEntity habit) {
        String normalized = normalizeCategoryName(habit.getCategoryId());
        return normalized.contains("вода") || normalized.contains("hydr") || normalized.contains("water");
    }

    private String normalizeCategoryName(Integer categoryId) {
        return habitCategoryRepository.findById(categoryId)
                .map(HabitCategoryEntity::getName)
                .orElse("")
                .trim()
                .toLowerCase();
    }

    private int calculateCurrentStreakDays(List<HabitCheckinEntity> checkins) {
        if (checkins.isEmpty()) {
            return 0;
        }
        Set<LocalDate> dates = checkins.stream()
                .map(HabitCheckinEntity::getCheckinDate)
                .collect(Collectors.toSet());
        LocalDate cursor = LocalDate.now();
        int streak = 0;
        while (dates.contains(cursor)) {
            streak++;
            cursor = cursor.minusDays(1);
        }
        return streak;
    }
}
