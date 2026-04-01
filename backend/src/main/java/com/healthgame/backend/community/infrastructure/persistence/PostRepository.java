package com.healthgame.backend.community.infrastructure.persistence;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PostRepository extends JpaRepository<PostEntity, Long> {

    Page<PostEntity> findByVisibilityOrderByCreatedAtDesc(String visibility, Pageable pageable);
}
