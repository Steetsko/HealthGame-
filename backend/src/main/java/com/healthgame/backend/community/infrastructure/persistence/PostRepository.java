package com.healthgame.backend.community.infrastructure.persistence;

import java.util.Collection;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PostRepository extends JpaRepository<PostEntity, Long> {

    Page<PostEntity> findByVisibilityAndModerationStatusInOrderByCreatedAtDesc(String visibility, Collection<String> moderationStatuses, Pageable pageable);

    Page<PostEntity> findByAuthorIdAndVisibilityAndModerationStatusInOrderByCreatedAtDesc(Long authorId, String visibility, Collection<String> moderationStatuses, Pageable pageable);

    long countByAuthorId(Long authorId);
}
