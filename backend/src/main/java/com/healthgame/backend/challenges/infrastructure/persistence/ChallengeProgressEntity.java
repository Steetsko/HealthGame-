package com.healthgame.backend.challenges.infrastructure.persistence;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.IdClass;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

@Entity
@IdClass(ChallengeProgressId.class)
@Table(name = "challenge_progress")
public class ChallengeProgressEntity {
    @Id
    @Column(name = "challenge_id", nullable = false)
    private Long challengeId;

    @Id
    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "current_value", nullable = false)
    private Integer currentValue;

    @Column(name = "completion_percent", nullable = false, precision = 5, scale = 2)
    private BigDecimal completionPercent;

    @Column(name = "last_checkin_date")
    private LocalDate lastCheckinDate;

    @Column(name = "completed_at")
    private Instant completedAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    public Long getChallengeId() { return challengeId; }
    public void setChallengeId(Long challengeId) { this.challengeId = challengeId; }
    public Long getUserId() { return userId; }
    public void setUserId(Long userId) { this.userId = userId; }
    public Integer getCurrentValue() { return currentValue; }
    public void setCurrentValue(Integer currentValue) { this.currentValue = currentValue; }
    public BigDecimal getCompletionPercent() { return completionPercent; }
    public void setCompletionPercent(BigDecimal completionPercent) { this.completionPercent = completionPercent; }
    public LocalDate getLastCheckinDate() { return lastCheckinDate; }
    public void setLastCheckinDate(LocalDate lastCheckinDate) { this.lastCheckinDate = lastCheckinDate; }
    public Instant getCompletedAt() { return completedAt; }
    public void setCompletedAt(Instant completedAt) { this.completedAt = completedAt; }
    public Instant getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Instant updatedAt) { this.updatedAt = updatedAt; }
}