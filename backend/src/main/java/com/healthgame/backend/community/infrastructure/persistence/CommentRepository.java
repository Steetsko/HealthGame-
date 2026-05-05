package com.healthgame.backend.community.infrastructure.persistence;

import java.util.Collection;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CommentRepository extends JpaRepository<CommentEntity, Long> {

    List<CommentEntity> findByPostIdAndModerationStatusInOrderByCreatedAtAsc(Long postId, Collection<String> moderationStatuses);

    List<CommentEntity> findByChallengeIdAndModerationStatusInOrderByCreatedAtAsc(Long challengeId, Collection<String> moderationStatuses);

    long countByAuthorId(Long authorId);
}
