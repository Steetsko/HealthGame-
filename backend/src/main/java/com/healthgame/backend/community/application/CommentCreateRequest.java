package com.healthgame.backend.community.application;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CommentCreateRequest(
        @NotBlank @Size(max = 1000) String text,
        Long parentCommentId
) {
}
