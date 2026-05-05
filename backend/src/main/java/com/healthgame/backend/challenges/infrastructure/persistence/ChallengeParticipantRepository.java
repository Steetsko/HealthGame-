package com.healthgame.backend.challenges.infrastructure.persistence;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ChallengeParticipantRepository extends JpaRepository<ChallengeParticipantEntity, ChallengeParticipantId> {
    List<ChallengeParticipantEntity> findByChallengeId(Long challengeId);
    List<ChallengeParticipantEntity> findByChallengeIdIn(List<Long> challengeIds);
    List<ChallengeParticipantEntity> findByChallengeIdInAndUserId(List<Long> challengeIds, Long userId);
    List<ChallengeParticipantEntity> findByUserId(Long userId);
    List<ChallengeParticipantEntity> findByUserIdAndParticipantStatus(Long userId, String participantStatus);
    Optional<ChallengeParticipantEntity> findByChallengeIdAndUserId(Long challengeId, Long userId);
    long countByUserIdAndParticipantStatus(Long userId, String participantStatus);
}
