package com.healthgame.backend.habits.infrastructure.persistence;

import java.time.LocalDate;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface HabitCheckinRepository extends JpaRepository<HabitCheckinEntity, Long> {

    boolean existsByHabitIdAndCheckinDate(Long habitId, LocalDate checkinDate);

    List<HabitCheckinEntity> findByHabitIdInAndCheckinDateBetween(List<Long> habitIds, LocalDate from, LocalDate to);

    List<HabitCheckinEntity> findByHabitIdInAndCheckinDate(List<Long> habitIds, LocalDate checkinDate);

    List<HabitCheckinEntity> findByHabitIdAndCheckinDateBetweenOrderByCheckinDateAsc(Long habitId, LocalDate from, LocalDate to);

    long countByHabitIdIn(List<Long> habitIds);

    List<HabitCheckinEntity> findByHabitIdInOrderByCheckinDateDesc(List<Long> habitIds);
}
