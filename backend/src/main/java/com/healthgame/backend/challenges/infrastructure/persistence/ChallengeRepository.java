package com.healthgame.backend.challenges.infrastructure.persistence;

import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ChallengeRepository extends JpaRepository<ChallengeEntity, Long> {

    @Query("select c from ChallengeEntity c where c.isPublic = true and c.status <> :status and c.moderationStatus = 'VISIBLE'")
    Page<ChallengeEntity> findPublicVisible(@Param("status") String status, Pageable pageable);

    @Query(
            value = "select c from ChallengeEntity c where c.creatorId = :userId or c.id in (select cp.challengeId from ChallengeParticipantEntity cp where cp.userId = :userId and cp.participantStatus in ('INVITED','ACCEPTED'))",
            countQuery = "select count(c) from ChallengeEntity c where c.creatorId = :userId or c.id in (select cp.challengeId from ChallengeParticipantEntity cp where cp.userId = :userId and cp.participantStatus in ('INVITED','ACCEPTED'))"
    )
    Page<ChallengeEntity> findForUser(@Param("userId") Long userId, Pageable pageable);

    @Query("select c from ChallengeEntity c where c.id = :challengeId and ((c.isPublic = true and c.moderationStatus = 'VISIBLE') or c.creatorId = :userId or c.id in (select cp.challengeId from ChallengeParticipantEntity cp where cp.userId = :userId and cp.participantStatus in ('INVITED','ACCEPTED')))")
    Optional<ChallengeEntity> findAccessibleById(@Param("challengeId") Long challengeId, @Param("userId") Long userId);
}