package com.healthgame.backend.community.application;

import java.time.Instant;
import java.util.List;
import java.util.Map;

public record CommunityPostResponse(
        Long id,
        Long authorId,
        String authorName,
        String authorNickname,
        String authorAvatarUrl,
        String text,
        String imageUrl,
        String visibility,
        String moderationStatus,
        String moderationNote,
        Instant createdAt,
        long likeCount,
        boolean likedByCurrentUser,
        String currentReaction,
        Map<String, Long> reactionCounts,
        List<CommunityCommentResponse> comments
) {
}
