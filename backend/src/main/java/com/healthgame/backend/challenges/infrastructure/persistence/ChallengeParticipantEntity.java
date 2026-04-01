package com.healthgame.backend.challenges.infrastructure.persistence;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.IdClass;
import jakarta.persistence.Table;
import java.time.Instant;

@Entity
@IdClass(ChallengeParticipantId.class)
@Table(name = "challenge_participants")
public class ChallengeParticipantEntity {
    @Id
    @Column(name = "challenge_id", nullable = false)
    private Long challengeId;

    @Id
    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "participant_role", nullable = false, length = 16)
    private String participantRole;

    @Column(name = "participant_status", nullable = false, length = 16)
    private String participantStatus;

    @Column(name = "joined_at", nullable = false)
    private Instant joinedAt;

    @Column(name = "invited_by")
    private Long invitedBy;

    @Column(name = "invited_at")
    private Instant invitedAt;

    @Column(name = "responded_at")
    private Instant respondedAt;

    public Long getChallengeId() { return challengeId; }
    public void setChallengeId(Long challengeId) { this.challengeId = challengeId; }
    public Long getUserId() { return userId; }
    public void setUserId(Long userId) { this.userId = userId; }
    public String getParticipantRole() { return participantRole; }
    public void setParticipantRole(String participantRole) { this.participantRole = participantRole; }
    public String getParticipantStatus() { return participantStatus; }
    public void setParticipantStatus(String participantStatus) { this.participantStatus = participantStatus; }
    public Instant getJoinedAt() { return joinedAt; }
    public void setJoinedAt(Instant joinedAt) { this.joinedAt = joinedAt; }
    public Long getInvitedBy() { return invitedBy; }
    public void setInvitedBy(Long invitedBy) { this.invitedBy = invitedBy; }
    public Instant getInvitedAt() { return invitedAt; }
    public void setInvitedAt(Instant invitedAt) { this.invitedAt = invitedAt; }
    public Instant getRespondedAt() { return respondedAt; }
    public void setRespondedAt(Instant respondedAt) { this.respondedAt = respondedAt; }
}