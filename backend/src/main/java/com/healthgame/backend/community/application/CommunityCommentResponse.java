package com.healthgame.backend.community.application;

import java.time.Instant;
import java.util.List;

public record CommunityCommentResponse(
        Long id,
        Long authorId,
        String authorName,
        String authorNickname,
        String text,
        Instant createdAt,
        List<CommunityCommentResponse> replies
) {
}
