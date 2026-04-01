package com.healthgame.backend.achievements.infrastructure.persistence;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Entity
@Table(name = "user_achievements")
public class UserAchievementEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "achievement_id", nullable = false)
    private Integer achievementId;

    @Column(name = "awarded_at", nullable = false)
    private Instant awardedAt;

    @Column(nullable = false, length = 24)
    private String source;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "context_json", columnDefinition = "jsonb")
    private String contextJson;

    public Long getId() { return id; }
    public Long getUserId() { return userId; }
    public void setUserId(Long userId) { this.userId = userId; }
    public Integer getAchievementId() { return achievementId; }
    public void setAchievementId(Integer achievementId) { this.achievementId = achievementId; }
    public Instant getAwardedAt() { return awardedAt; }
    public void setAwardedAt(Instant awardedAt) { this.awardedAt = awardedAt; }
    public String getSource() { return source; }
    public void setSource(String source) { this.source = source; }
    public String getContextJson() { return contextJson; }
    public void setContextJson(String contextJson) { this.contextJson = contextJson; }
}