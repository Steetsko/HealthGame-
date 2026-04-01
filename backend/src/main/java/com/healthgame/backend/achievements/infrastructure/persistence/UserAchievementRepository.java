package com.healthgame.backend.achievements.infrastructure.persistence;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserAchievementRepository extends JpaRepository<UserAchievementEntity, Long> {
    List<UserAchievementEntity> findByUserIdOrderByAwardedAtDesc(Long userId);
    Optional<UserAchievementEntity> findByUserIdAndAchievementId(Long userId, Integer achievementId);
}