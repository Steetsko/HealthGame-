package com.healthgame.backend.community.application;

import com.healthgame.backend.challenges.infrastructure.persistence.ChallengeRepository;
import com.healthgame.backend.community.infrastructure.persistence.CommentEntity;
import com.healthgame.backend.community.infrastructure.persistence.CommentRepository;
import com.healthgame.backend.community.infrastructure.persistence.PostEntity;
import com.healthgame.backend.community.infrastructure.persistence.PostReactionEntity;
import com.healthgame.backend.community.infrastructure.persistence.PostReactionRepository;
import com.healthgame.backend.community.infrastructure.persistence.PostRepository;
import com.healthgame.backend.identity.infrastructure.persistence.UserEntity;
import com.healthgame.backend.identity.infrastructure.persistence.UserRepository;
import com.healthgame.backend.identity.infrastructure.security.AuthenticatedUser;
import com.healthgame.backend.shared.domain.ConflictException;
import com.healthgame.backend.shared.domain.ResourceNotFoundException;
import jakarta.transaction.Transactional;
import java.time.Instant;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

@Service
public class CommunityApplicationService {

    private final PostRepository postRepository;
    private final CommentRepository commentRepository;
    private final PostReactionRepository postReactionRepository;
    private final UserRepository userRepository;
    private final ChallengeRepository challengeRepository;

    public CommunityApplicationService(
            PostRepository postRepository,
            CommentRepository commentRepository,
            PostReactionRepository postReactionRepository,
            UserRepository userRepository,
            ChallengeRepository challengeRepository
    ) {
        this.postRepository = postRepository;
        this.commentRepository = commentRepository;
        this.postReactionRepository = postReactionRepository;
        this.userRepository = userRepository;
        this.challengeRepository = challengeRepository;
    }

    public Page<CommunityPostResponse> listPosts(AuthenticatedUser authenticatedUser, Pageable pageable) {
        Page<PostEntity> page = postRepository.findByVisibilityOrderByCreatedAtDesc("PUBLIC", pageable);
        List<PostEntity> posts = page.getContent();
        List<Long> authorIds = posts.stream().map(PostEntity::getAuthorId).distinct().toList();
        Map<Long, UserEntity> users = loadUsers(authorIds);
        List<Long> postIds = posts.stream().map(PostEntity::getId).toList();
        Map<Long, Boolean> likedByCurrentUser = postIds.isEmpty()
                ? Map.of()
                : postReactionRepository.findByPostIdInAndUserId(postIds, authenticatedUser.userId()).stream()
                .collect(Collectors.toMap(PostReactionEntity::getPostId, reaction -> true));

        return page.map(post -> {
            List<CommentEntity> comments = commentRepository.findByPostIdOrderByCreatedAtAsc(post.getId());
            Map<Long, UserEntity> commentUsers = enrichUsersForComments(users, comments);
            return new CommunityPostResponse(
                    post.getId(),
                    post.getAuthorId(),
                    displayName(users.get(post.getAuthorId())),
                    nickname(users.get(post.getAuthorId())),
                    post.getText(),
                    post.getImageUrl(),
                    post.getVisibility(),
                    post.getCreatedAt(),
                    postReactionRepository.countByPostId(post.getId()),
                    likedByCurrentUser.containsKey(post.getId()),
                    buildCommentTree(comments, commentUsers)
            );
        });
    }

    @Transactional
    public CommunityPostResponse createPost(AuthenticatedUser authenticatedUser, PostCreateRequest request) {
        PostEntity post = new PostEntity();
        post.setAuthorId(authenticatedUser.userId());
        post.setType("TEXT");
        post.setText(request.text().trim());
        post.setVisibility(normalizeVisibility(request.visibility()));
        post.setImageUrl(blankToNull(request.imageUrl()));
        post.setCreatedAt(Instant.now());
        PostEntity saved = postRepository.save(post);
        UserEntity user = loadUser(authenticatedUser.userId());
        return new CommunityPostResponse(
                saved.getId(),
                saved.getAuthorId(),
                displayName(user),
                nickname(user),
                saved.getText(),
                saved.getImageUrl(),
                saved.getVisibility(),
                saved.getCreatedAt(),
                0,
                false,
                List.of()
        );
    }

    @Transactional
    public CommunityCommentResponse createPostComment(AuthenticatedUser authenticatedUser, Long postId, CommentCreateRequest request) {
        postRepository.findById(postId).orElseThrow(() -> new ResourceNotFoundException("Post was not found"));
        validateParentComment(request.parentCommentId(), postId, null);

        CommentEntity comment = new CommentEntity();
        comment.setPostId(postId);
        comment.setAuthorId(authenticatedUser.userId());
        comment.setParentCommentId(request.parentCommentId());
        comment.setText(request.text().trim());
        comment.setCreatedAt(Instant.now());
        CommentEntity saved = commentRepository.save(comment);

        UserEntity author = loadUser(authenticatedUser.userId());
        return new CommunityCommentResponse(saved.getId(), author.getId(), displayName(author), author.getNickname(), saved.getText(), saved.getCreatedAt(), List.of());
    }

    @Transactional
    public CommunityPostResponse toggleLike(AuthenticatedUser authenticatedUser, Long postId) {
        PostEntity post = postRepository.findById(postId).orElseThrow(() -> new ResourceNotFoundException("Post was not found"));
        postReactionRepository.findByPostIdAndUserId(postId, authenticatedUser.userId()).ifPresentOrElse(
                postReactionRepository::delete,
                () -> {
                    PostReactionEntity reaction = new PostReactionEntity();
                    reaction.setPostId(postId);
                    reaction.setUserId(authenticatedUser.userId());
                    reaction.setReaction("like");
                    reaction.setCreatedAt(Instant.now());
                    postReactionRepository.save(reaction);
                }
        );

        UserEntity author = loadUser(post.getAuthorId());
        List<CommentEntity> comments = commentRepository.findByPostIdOrderByCreatedAtAsc(postId);
        Map<Long, UserEntity> commentUsers = enrichUsersForComments(Map.of(author.getId(), author), comments);
        boolean liked = postReactionRepository.findByPostIdAndUserId(postId, authenticatedUser.userId()).isPresent();
        return new CommunityPostResponse(
                post.getId(),
                post.getAuthorId(),
                displayName(author),
                nickname(author),
                post.getText(),
                post.getImageUrl(),
                post.getVisibility(),
                post.getCreatedAt(),
                postReactionRepository.countByPostId(post.getId()),
                liked,
                buildCommentTree(comments, commentUsers)
        );
    }

    public List<CommunityCommentResponse> getChallengeDiscussion(AuthenticatedUser authenticatedUser, Long challengeId) {
        ensureChallengeExists(challengeId);
        List<CommentEntity> comments = commentRepository.findByChallengeIdOrderByCreatedAtAsc(challengeId);
        Map<Long, UserEntity> users = enrichUsersForComments(Map.of(), comments);
        return buildCommentTree(comments, users);
    }

    @Transactional
    public CommunityCommentResponse createChallengeDiscussionComment(AuthenticatedUser authenticatedUser, Long challengeId, CommentCreateRequest request) {
        ensureChallengeExists(challengeId);
        validateParentComment(request.parentCommentId(), null, challengeId);

        CommentEntity comment = new CommentEntity();
        comment.setChallengeId(challengeId);
        comment.setAuthorId(authenticatedUser.userId());
        comment.setParentCommentId(request.parentCommentId());
        comment.setText(request.text().trim());
        comment.setCreatedAt(Instant.now());
        CommentEntity saved = commentRepository.save(comment);

        UserEntity author = loadUser(authenticatedUser.userId());
        return new CommunityCommentResponse(saved.getId(), author.getId(), displayName(author), author.getNickname(), saved.getText(), saved.getCreatedAt(), List.of());
    }

    private void ensureChallengeExists(Long challengeId) {
        if (!challengeRepository.existsById(challengeId)) {
            throw new ResourceNotFoundException("Challenge was not found");
        }
    }

    private void validateParentComment(Long parentCommentId, Long postId, Long challengeId) {
        if (parentCommentId == null) {
            return;
        }
        CommentEntity parent = commentRepository.findById(parentCommentId)
                .orElseThrow(() -> new ResourceNotFoundException("Parent comment was not found"));
        boolean samePost = postId != null && postId.equals(parent.getPostId());
        boolean sameChallenge = challengeId != null && challengeId.equals(parent.getChallengeId());
        if (!samePost && !sameChallenge) {
            throw new ConflictException("Parent comment belongs to another discussion");
        }
    }

    private String normalizeVisibility(String visibility) {
        String normalized = visibility == null || visibility.isBlank() ? "PUBLIC" : visibility.trim().toUpperCase();
        if (!List.of("PUBLIC", "FRIENDS", "PRIVATE").contains(normalized)) {
            throw new ConflictException("Visibility must be PUBLIC, FRIENDS or PRIVATE");
        }
        return normalized;
    }

    private String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    private UserEntity loadUser(Long userId) {
        return userRepository.findById(userId).orElseThrow(() -> new ResourceNotFoundException("User was not found"));
    }

    private Map<Long, UserEntity> loadUsers(List<Long> userIds) {
        if (userIds == null || userIds.isEmpty()) {
            return Map.of();
        }
        return userRepository.findAllById(userIds).stream().collect(Collectors.toMap(UserEntity::getId, Function.identity()));
    }

    private Map<Long, UserEntity> enrichUsersForComments(Map<Long, UserEntity> initialUsers, List<CommentEntity> comments) {
        Map<Long, UserEntity> users = new HashMap<>(initialUsers);
        List<Long> missingIds = comments.stream()
                .map(CommentEntity::getAuthorId)
                .filter(authorId -> !users.containsKey(authorId))
                .distinct()
                .toList();
        users.putAll(loadUsers(missingIds));
        return users;
    }

    private List<CommunityCommentResponse> buildCommentTree(List<CommentEntity> comments, Map<Long, UserEntity> users) {
        Map<Long, List<CommentEntity>> repliesByParentId = comments.stream()
                .filter(comment -> comment.getParentCommentId() != null)
                .collect(Collectors.groupingBy(CommentEntity::getParentCommentId));

        return comments.stream()
                .filter(comment -> comment.getParentCommentId() == null)
                .sorted(Comparator.comparing(CommentEntity::getCreatedAt))
                .map(comment -> toCommentResponse(comment, repliesByParentId, users))
                .toList();
    }

    private CommunityCommentResponse toCommentResponse(CommentEntity comment, Map<Long, List<CommentEntity>> repliesByParentId, Map<Long, UserEntity> users) {
        UserEntity author = users.get(comment.getAuthorId());
        List<CommunityCommentResponse> replies = repliesByParentId.getOrDefault(comment.getId(), List.of()).stream()
                .sorted(Comparator.comparing(CommentEntity::getCreatedAt))
                .map(reply -> toCommentResponse(reply, repliesByParentId, users))
                .toList();
        return new CommunityCommentResponse(
                comment.getId(),
                comment.getAuthorId(),
                displayName(author),
                nickname(author),
                comment.getText(),
                comment.getCreatedAt(),
                replies
        );
    }

    private String displayName(UserEntity user) {
        if (user == null) {
            return "Пользователь";
        }
        if (user.getFirstName() != null && !user.getFirstName().isBlank()) {
            return user.getFirstName();
        }
        return user.getNickname();
    }

    private String nickname(UserEntity user) {
        return user == null ? "user" : user.getNickname();
    }
}
