package com.healthgame.backend.community.infrastructure.persistence;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PostReactionRepository extends JpaRepository<PostReactionEntity, PostReactionId> {

    Optional<PostReactionEntity> findByPostIdAndUserId(Long postId, Long userId);

    List<PostReactionEntity> findByPostIdInAndUserId(List<Long> postIds, Long userId);

    List<PostReactionEntity> findByPostIdIn(List<Long> postIds);

    List<PostReactionEntity> findByPostId(Long postId);

    long countByPostId(Long postId);

    long countByUserId(Long userId);
}