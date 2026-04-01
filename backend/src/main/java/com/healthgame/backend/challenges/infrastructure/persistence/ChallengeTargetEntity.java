package com.healthgame.backend.challenges.infrastructure.persistence;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "challenge_targets")
public class ChallengeTargetEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "challenge_id", nullable = false)
    private Long challengeId;

    @Column(name = "target_kind", nullable = false, length = 16)
    private String targetKind;

    @Column(name = "habit_id")
    private Long habitId;

    @Column(name = "category_id")
    private Integer categoryId;

    @Column(length = 20)
    private String unit;

    public Long getId() { return id; }
    public Long getChallengeId() { return challengeId; }
    public void setChallengeId(Long challengeId) { this.challengeId = challengeId; }
    public String getTargetKind() { return targetKind; }
    public void setTargetKind(String targetKind) { this.targetKind = targetKind; }
    public Long getHabitId() { return habitId; }
    public void setHabitId(Long habitId) { this.habitId = habitId; }
    public Integer getCategoryId() { return categoryId; }
    public void setCategoryId(Integer categoryId) { this.categoryId = categoryId; }
    public String getUnit() { return unit; }
    public void setUnit(String unit) { this.unit = unit; }
}