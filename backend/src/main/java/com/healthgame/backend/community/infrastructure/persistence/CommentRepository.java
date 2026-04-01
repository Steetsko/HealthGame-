package com.healthgame.backend.community.infrastructure.persistence;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CommentRepository extends JpaRepository<CommentEntity, Long> {

    List<CommentEntity> findByPostIdOrderByCreatedAtAsc(Long postId);

    List<CommentEntity> findByChallengeIdOrderByCreatedAtAsc(Long challengeId);
}
