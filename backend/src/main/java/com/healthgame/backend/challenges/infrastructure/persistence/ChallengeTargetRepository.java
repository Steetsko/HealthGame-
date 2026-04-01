package com.healthgame.backend.challenges.infrastructure.persistence;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ChallengeTargetRepository extends JpaRepository<ChallengeTargetEntity, Long> {
    List<ChallengeTargetEntity> findByChallengeId(Long challengeId);
    List<ChallengeTargetEntity> findByChallengeIdIn(List<Long> challengeIds);
}