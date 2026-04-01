package com.healthgame.backend.community.infrastructure.persistence;

import java.io.Serializable;
import java.util.Objects;

public class PostReactionId implements Serializable {

    private Long postId;
    private Long userId;

    public PostReactionId() {
    }

    public PostReactionId(Long postId, Long userId) {
        this.postId = postId;
        this.userId = userId;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) {
            return true;
        }
        if (!(o instanceof PostReactionId that)) {
            return false;
        }
        return Objects.equals(postId, that.postId) && Objects.equals(userId, that.userId);
    }

    @Override
    public int hashCode() {
        return Objects.hash(postId, userId);
    }
}
