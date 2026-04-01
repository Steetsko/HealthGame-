package com.healthgame.backend.habits.infrastructure.persistence;

import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface HabitRepository extends JpaRepository<HabitEntity, Long> {

    Page<HabitEntity> findByUserId(Long userId, Pageable pageable);

    List<HabitEntity> findByUserId(Long userId);

    Optional<HabitEntity> findByIdAndUserId(Long id, Long userId);

    List<HabitEntity> findByUserIdAndActiveTrue(Long userId);
}