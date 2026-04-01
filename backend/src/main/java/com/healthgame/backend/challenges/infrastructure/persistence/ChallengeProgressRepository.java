package com.healthgame.backend.challenges.infrastructure.persistence;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ChallengeProgressRepository extends JpaRepository<ChallengeProgressEntity, ChallengeProgressId> {
    Optional<ChallengeProgressEntity> findByChallengeIdAndUserId(Long challengeId, Long userId);
    List<ChallengeProgressEntity> findByChallengeIdInAndUserId(List<Long> challengeIds, Long userId);
}