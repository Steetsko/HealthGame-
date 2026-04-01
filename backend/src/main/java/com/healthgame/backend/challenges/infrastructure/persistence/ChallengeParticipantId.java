package com.healthgame.backend.challenges.infrastructure.persistence;

import java.io.Serializable;
import java.util.Objects;

public class ChallengeParticipantId implements Serializable {
    private Long challengeId;
    private Long userId;

    public ChallengeParticipantId() {
    }

    public ChallengeParticipantId(Long challengeId, Long userId) {
        this.challengeId = challengeId;
        this.userId = userId;
    }

    @Override
    public boolean equals(Object object) {
        if (this == object) {
            return true;
        }
        if (!(object instanceof ChallengeParticipantId that)) {
            return false;
        }
        return Objects.equals(challengeId, that.challengeId) && Objects.equals(userId, that.userId);
    }

    @Override
    public int hashCode() {
        return Objects.hash(challengeId, userId);
    }
}