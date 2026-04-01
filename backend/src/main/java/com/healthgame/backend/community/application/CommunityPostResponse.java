package com.healthgame.backend.community.application;

import java.time.Instant;
import java.util.List;

public record CommunityPostResponse(
        Long id,
        Long authorId,
        String authorName,
        String authorNickname,
        String text,
        String imageUrl,
        String visibility,
        Instant createdAt,
        long likeCount,
        boolean likedByCurrentUser,
        List<CommunityCommentResponse> comments
) {
}
