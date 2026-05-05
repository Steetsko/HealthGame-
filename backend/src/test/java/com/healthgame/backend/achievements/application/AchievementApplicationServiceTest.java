package com.healthgame.backend.achievements.application;

import com.healthgame.backend.achievements.infrastructure.persistence.AchievementEntity;
import com.healthgame.backend.achievements.infrastructure.persistence.AchievementRepository;
import com.healthgame.backend.achievements.infrastructure.persistence.UserAchievementEntity;
import com.healthgame.backend.achievements.infrastructure.persistence.UserAchievementRepository;
import com.healthgame.backend.challenges.infrastructure.persistence.ChallengeParticipantRepository;
import com.healthgame.backend.challenges.infrastructure.persistence.ChallengeProgressRepository;
import com.healthgame.backend.community.infrastructure.persistence.CommentRepository;
import com.healthgame.backend.community.infrastructure.persistence.PostReactionRepository;
import com.healthgame.backend.community.infrastructure.persistence.PostRepository;
import com.healthgame.backend.habits.infrastructure.persistence.HabitCategoryRepository;
import com.healthgame.backend.habits.infrastructure.persistence.HabitCheckinRepository;
import com.healthgame.backend.habits.infrastructure.persistence.HabitRepository;
import com.healthgame.backend.identity.infrastructure.security.AuthenticatedUser;
import com.healthgame.backend.notifications.application.NotificationApplicationService;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Captor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AchievementApplicationServiceTest {

    @Mock
    private AchievementRepository achievementRepository;

    @Mock
    private UserAchievementRepository userAchievementRepository;

    @Mock
    private NotificationApplicationService notificationApplicationService;

    @Mock
    private CommentRepository commentRepository;

    @Mock
    private PostRepository postRepository;

    @Mock
    private PostReactionRepository postReactionRepository;

    @Mock
    private HabitRepository habitRepository;

    @Mock
    private HabitCategoryRepository habitCategoryRepository;

    @Mock
    private HabitCheckinRepository habitCheckinRepository;

    @Mock
    private ChallengeProgressRepository challengeProgressRepository;

    @Mock
    private ChallengeParticipantRepository challengeParticipantRepository;

    @InjectMocks
    private AchievementApplicationService achievementApplicationService;

    @Captor
    private ArgumentCaptor<UserAchievementEntity> userAchievementCaptor;

    @Test
    void awardFirstCheckinCreatesAwardAndNotificationWhenMissing() {
        AchievementEntity achievement = new AchievementEntity();
        setAchievementField(achievement, "id", 3);
        setAchievementField(achievement, "code", "FIRST_CHECKIN");
        setAchievementField(achievement, "name", "Первый чек-ин");

        when(achievementRepository.findByCode("FIRST_CHECKIN")).thenReturn(Optional.of(achievement));
        when(userAchievementRepository.findByUserIdAndAchievementId(12L, 3)).thenReturn(Optional.empty());

        achievementApplicationService.awardFirstCheckin(12L);

        verify(userAchievementRepository).save(userAchievementCaptor.capture());
        assertThat(userAchievementCaptor.getValue().getUserId()).isEqualTo(12L);
        assertThat(userAchievementCaptor.getValue().getAchievementId()).isEqualTo(3);
        assertThat(userAchievementCaptor.getValue().getSource()).isEqualTo("HABIT");
        verify(notificationApplicationService).notifyAchievementUnlocked(12L, "Первый чек-ин", "/dashboard");
    }

    @Test
    void awardChallengeJoinerSkipsDuplicateAward() {
        AchievementEntity achievement = new AchievementEntity();
        setAchievementField(achievement, "id", 8);
        setAchievementField(achievement, "code", "CHALLENGE_JOINER");
        setAchievementField(achievement, "name", "Челлендж");

        when(achievementRepository.findByCode("CHALLENGE_JOINER")).thenReturn(Optional.of(achievement));
        when(userAchievementRepository.findByUserIdAndAchievementId(7L, 8)).thenReturn(Optional.of(new UserAchievementEntity()));
        when(challengeParticipantRepository.countByUserIdAndParticipantStatus(7L, "ACCEPTED")).thenReturn(0L);

        achievementApplicationService.awardChallengeJoiner(7L);

        verify(userAchievementRepository, never()).save(org.mockito.ArgumentMatchers.any());
        verify(notificationApplicationService, never()).notifyAchievementUnlocked(org.mockito.ArgumentMatchers.anyLong(), org.mockito.ArgumentMatchers.anyString(), org.mockito.ArgumentMatchers.anyString());
    }

    @Test
    void getMyAchievementsMapsAwardsWithMetadata() {
        UserAchievementEntity award = new UserAchievementEntity();
        ReflectionTestUtils.setField(award, "id", 501L);
        award.setUserId(4L);
        award.setAchievementId(9);
        award.setSource("HABIT");
        award.setAwardedAt(Instant.parse("2026-05-01T10:15:30Z"));

        AchievementEntity unlockedAchievement = new AchievementEntity();
        setAchievementField(unlockedAchievement, "id", 9);
        setAchievementField(unlockedAchievement, "code", "FIRST_CHECKIN");
        setAchievementField(unlockedAchievement, "name", "First");
        setAchievementField(unlockedAchievement, "description", "Desc");
        setAchievementField(unlockedAchievement, "icon", "star");
        setAchievementField(unlockedAchievement, "rarity", "common");
        ReflectionTestUtils.setField(unlockedAchievement, "active", true);

        AchievementEntity lockedAchievement = new AchievementEntity();
        setAchievementField(lockedAchievement, "id", 10);
        setAchievementField(lockedAchievement, "code", "OTHER");
        setAchievementField(lockedAchievement, "name", "Locked");
        setAchievementField(lockedAchievement, "description", "Not yet");
        setAchievementField(lockedAchievement, "icon", "award");
        setAchievementField(lockedAchievement, "rarity", "rare");
        ReflectionTestUtils.setField(lockedAchievement, "active", true);

        when(userAchievementRepository.findByUserIdOrderByAwardedAtDesc(4L)).thenReturn(List.of(award));
        when(achievementRepository.findAllByActiveTrueOrderByIdAsc()).thenReturn(List.of(lockedAchievement, unlockedAchievement));

        List<AchievementResponse> responses = achievementApplicationService.getMyAchievements(new AuthenticatedUser(4L, "user@example.com", List.of()));

        assertThat(responses).hasSize(2);
        assertThat(responses.getFirst().unlocked()).isTrue();
        assertThat(responses.getFirst().code()).isEqualTo("FIRST_CHECKIN");
        assertThat(responses.getFirst().awardId()).isEqualTo(501L);
        assertThat(responses.get(1).unlocked()).isFalse();
        assertThat(responses.get(1).code()).isEqualTo("OTHER");
        assertThat(responses.get(1).awardId()).isNull();
    }

    private void setAchievementField(AchievementEntity achievement, String field, Object value) {
        ReflectionTestUtils.setField(achievement, field, value);
    }
}
