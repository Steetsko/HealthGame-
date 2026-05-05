package com.healthgame.backend.community.api;

import com.healthgame.backend.community.application.CommentCreateRequest;
import com.healthgame.backend.community.application.CommunityApplicationService;
import com.healthgame.backend.community.application.CommunityCommentResponse;
import com.healthgame.backend.community.application.CommunityPostResponse;
import com.healthgame.backend.community.application.PostCreateRequest;
import com.healthgame.backend.community.application.PostReactionRequest;
import com.healthgame.backend.identity.infrastructure.security.AuthenticatedUser;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/community")
@SecurityRequirement(name = "bearerAuth")
public class CommunityController {

    private final CommunityApplicationService communityApplicationService;

    public CommunityController(CommunityApplicationService communityApplicationService) {
        this.communityApplicationService = communityApplicationService;
    }

    @Operation(summary = "Get public community feed")
    @GetMapping("/posts")
    public Page<CommunityPostResponse> listPosts(
            @AuthenticationPrincipal AuthenticatedUser authenticatedUser,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        Pageable pageable = PageRequest.of(page, size);
        return communityApplicationService.listPosts(authenticatedUser, pageable);
    }

    @Operation(summary = "Get public posts created by a user")
    @GetMapping("/users/{userId}/posts")
    public Page<CommunityPostResponse> listUserPosts(
            @AuthenticationPrincipal AuthenticatedUser authenticatedUser,
            @PathVariable Long userId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        Pageable pageable = PageRequest.of(page, size);
        return communityApplicationService.listPostsByAuthor(authenticatedUser, userId, pageable);
    }

    @Operation(summary = "Create a community post")
    @PostMapping("/posts")
    public CommunityPostResponse createPost(
            @AuthenticationPrincipal AuthenticatedUser authenticatedUser,
            @Valid @RequestBody PostCreateRequest request
    ) {
        return communityApplicationService.createPost(authenticatedUser, request);
    }

    @Operation(summary = "Add a comment to a community post")
    @PostMapping("/posts/{postId}/comments")
    public CommunityCommentResponse commentOnPost(
            @AuthenticationPrincipal AuthenticatedUser authenticatedUser,
            @PathVariable Long postId,
            @Valid @RequestBody CommentCreateRequest request
    ) {
        return communityApplicationService.createPostComment(authenticatedUser, postId, request);
    }

    @Operation(summary = "Set reaction on a community post")
    @PostMapping("/posts/{postId}/reactions")
    public CommunityPostResponse react(
            @AuthenticationPrincipal AuthenticatedUser authenticatedUser,
            @PathVariable Long postId,
            @Valid @RequestBody PostReactionRequest request
    ) {
        return communityApplicationService.setReaction(authenticatedUser, postId, request);
    }

    @Operation(summary = "Toggle like on a community post")
    @PostMapping("/posts/{postId}/likes/toggle")
    public CommunityPostResponse toggleLike(
            @AuthenticationPrincipal AuthenticatedUser authenticatedUser,
            @PathVariable Long postId
    ) {
        return communityApplicationService.toggleLike(authenticatedUser, postId);
    }

    @Operation(summary = "Get challenge discussion comments")
    @GetMapping("/challenges/{challengeId}/discussion")
    public List<CommunityCommentResponse> getChallengeDiscussion(
            @AuthenticationPrincipal AuthenticatedUser authenticatedUser,
            @PathVariable Long challengeId
    ) {
        return communityApplicationService.getChallengeDiscussion(authenticatedUser, challengeId);
    }

    @Operation(summary = "Add a comment to challenge discussion")
    @PostMapping("/challenges/{challengeId}/discussion")
    public CommunityCommentResponse commentOnChallenge(
            @AuthenticationPrincipal AuthenticatedUser authenticatedUser,
            @PathVariable Long challengeId,
            @Valid @RequestBody CommentCreateRequest request
    ) {
        return communityApplicationService.createChallengeDiscussionComment(authenticatedUser, challengeId, request);
    }
}