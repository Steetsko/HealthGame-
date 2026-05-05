package com.healthgame.backend.achievements.infrastructure.persistence;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AchievementRepository extends JpaRepository<AchievementEntity, Integer> {
    Optional<AchievementEntity> findByCode(String code);

    List<AchievementEntity> findAllByActiveTrueOrderByIdAsc();
}