package com.healthgame.backend.habits.infrastructure.persistence;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.LocalTime;

@Entity
@Table(name = "habit_schedules")
public class HabitScheduleEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "habit_id", nullable = false)
    private Long habitId;

    @Column(name = "day_of_week")
    private Short dayOfWeek;

    @Column(name = "time_of_day")
    private LocalTime timeOfDay;

    @Column(name = "min_times_per_day")
    private Short minTimesPerDay;

    @Column(name = "is_enabled", nullable = false)
    private boolean enabled;

    public Long getId() { return id; }
    public Long getHabitId() { return habitId; }
    public void setHabitId(Long habitId) { this.habitId = habitId; }
    public Short getDayOfWeek() { return dayOfWeek; }
    public void setDayOfWeek(Short dayOfWeek) { this.dayOfWeek = dayOfWeek; }
    public LocalTime getTimeOfDay() { return timeOfDay; }
    public void setTimeOfDay(LocalTime timeOfDay) { this.timeOfDay = timeOfDay; }
    public Short getMinTimesPerDay() { return minTimesPerDay; }
    public void setMinTimesPerDay(Short minTimesPerDay) { this.minTimesPerDay = minTimesPerDay; }
    public boolean isEnabled() { return enabled; }
    public void setEnabled(boolean enabled) { this.enabled = enabled; }
}