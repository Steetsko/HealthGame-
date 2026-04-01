package com.healthgame.backend.challenges.infrastructure.persistence;

import java.io.Serializable;
import java.util.Objects;

public class ChallengeProgressId implements Serializable {
    private Long challengeId;
    private Long userId;

    public ChallengeProgressId() {
    }

    public ChallengeProgressId(Long challengeId, Long userId) {
        this.challengeId = challengeId;
        this.userId = userId;
    }

    @Override
    public boolean equals(Object object) {
        if (this == object) {
            return true;
        }
        if (!(object instanceof ChallengeProgressId that)) {
            return false;
        }
        return Objects.equals(challengeId, that.challengeId) && Objects.equals(userId, that.userId);
    }

    @Override
    public int hashCode() {
        return Objects.hash(challengeId, userId);
    }
}