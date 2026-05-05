package com.healthgame.backend.community.application;

import java.time.Instant;
import java.util.List;

public record CommunityCommentResponse(
        Long id,
        Long authorId,
        String authorName,
        String authorNickname,
        String authorAvatarUrl,
        String text,
        String moderationStatus,
        String moderationNote,
        Instant createdAt,
        List<CommunityCommentResponse> replies
) {
}
