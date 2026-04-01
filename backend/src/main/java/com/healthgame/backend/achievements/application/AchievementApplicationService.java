package com.healthgame.backend.achievements.application;

import com.healthgame.backend.achievements.infrastructure.persistence.AchievementEntity;
import com.healthgame.backend.achievements.infrastructure.persistence.AchievementRepository;
import com.healthgame.backend.achievements.infrastructure.persistence.UserAchievementEntity;
import com.healthgame.backend.achievements.infrastructure.persistence.UserAchievementRepository;
import com.healthgame.backend.identity.infrastructure.security.AuthenticatedUser;
import com.healthgame.backend.shared.domain.ResourceNotFoundException;
import jakarta.transaction.Transactional;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;

@Service
public class AchievementApplicationService {

    private final AchievementRepository achievementRepository;
    private final UserAchievementRepository userAchievementRepository;

    public AchievementApplicationService(
            AchievementRepository achievementRepository,
            UserAchievementRepository userAchievementRepository
    ) {
        this.achievementRepository = achievementRepository;
        this.userAchievementRepository = userAchievementRepository;
    }

    public List<AchievementResponse> getMyAchievements(AuthenticatedUser authenticatedUser) {
        List<UserAchievementEntity> awards = userAchievementRepository.findByUserIdOrderByAwardedAtDesc(authenticatedUser.userId());
        Map<Integer, AchievementEntity> achievements = achievementRepository.findAllById(
                awards.stream().map(UserAchievementEntity::getAchievementId).collect(Collectors.toSet())
        ).stream().collect(Collectors.toMap(AchievementEntity::getId, Function.identity()));

        return awards.stream()
                .map(award -> {
                    AchievementEntity achievement = achievements.get(award.getAchievementId());
                    return new AchievementResponse(
                            achievement != null ? achievement.getCode() : null,
                            achievement != null ? achievement.getName() : null,
                            achievement != null ? achievement.getDescription() : null,
                            achievement != null ? achievement.getIcon() : null,
                            achievement != null ? achievement.getRarity() : null,
                            award.getAwardedAt(),
                            award.getSource()
                    );
                })
                .toList();
    }

    @Transactional
    public void awardFirstCheckin(Long userId) {
        awardByCodeIfAbsent(userId, "FIRST_CHECKIN", "HABIT");
    }

    @Transactional
    public void awardChallengeJoiner(Long userId) {
        awardByCodeIfAbsent(userId, "CHALLENGE_JOINER", "CHALLENGE");
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
    }
}