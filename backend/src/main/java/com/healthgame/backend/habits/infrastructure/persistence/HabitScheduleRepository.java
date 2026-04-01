package com.healthgame.backend.habits.infrastructure.persistence;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface HabitScheduleRepository extends JpaRepository<HabitScheduleEntity, Long> {

    List<HabitScheduleEntity> findByHabitId(Long habitId);

    List<HabitScheduleEntity> findByHabitIdIn(List<Long> habitIds);

    void deleteByHabitId(Long habitId);
}