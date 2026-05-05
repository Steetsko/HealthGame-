package com.healthgame.backend.community.application;

import com.healthgame.backend.achievements.application.AchievementApplicationService;
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
import com.healthgame.backend.notifications.application.NotificationApplicationService;
import com.healthgame.backend.shared.domain.ConflictException;
import com.healthgame.backend.shared.domain.ResourceNotFoundException;
import jakarta.transaction.Transactional;
import java.time.Instant;
import java.util.Collection;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

@Service
public class CommunityApplicationService {

    private static final String VISIBLE = "VISIBLE";
    private static final String HIDDEN = "HIDDEN";
    private static final String DEFAULT_REACTION = "like";
    private static final List<String> FEED_STATUSES = List.of(VISIBLE, HIDDEN);
    private static final List<String> ALLOWED_REACTIONS = List.of("like", "fire", "clap");

    private final PostRepository postRepository;
    private final CommentRepository commentRepository;
    private final PostReactionRepository postReactionRepository;
    private final UserRepository userRepository;
    private final ChallengeRepository challengeRepository;
    private final AchievementApplicationService achievementApplicationService;
    private final NotificationApplicationService notificationApplicationService;

    public CommunityApplicationService(
            PostRepository postRepository,
            CommentRepository commentRepository,
            PostReactionRepository postReactionRepository,
            UserRepository userRepository,
            ChallengeRepository challengeRepository,
            AchievementApplicationService achievementApplicationService,
            NotificationApplicationService notificationApplicationService
    ) {
        this.postRepository = postRepository;
        this.commentRepository = commentRepository;
        this.postReactionRepository = postReactionRepository;
        this.userRepository = userRepository;
        this.challengeRepository = challengeRepository;
        this.achievementApplicationService = achievementApplicationService;
        this.notificationApplicationService = notificationApplicationService;
    }

    public Page<CommunityPostResponse> listPosts(AuthenticatedUser authenticatedUser, Pageable pageable) {
        Page<PostEntity> page = postRepository.findByVisibilityAndModerationStatusInOrderByCreatedAtDesc("PUBLIC", FEED_STATUSES, pageable);
        return mapPosts(page, authenticatedUser);
    }

    public Page<CommunityPostResponse> listPostsByAuthor(AuthenticatedUser authenticatedUser, Long userId, Pageable pageable) {
        userRepository.findById(userId).orElseThrow(() -> new ResourceNotFoundException("User was not found"));
        Page<PostEntity> page = postRepository.findByAuthorIdAndVisibilityAndModerationStatusInOrderByCreatedAtDesc(userId, "PUBLIC", FEED_STATUSES, pageable);
        return mapPosts(page, authenticatedUser);
    }

    @Transactional
    public CommunityPostResponse createPost(AuthenticatedUser authenticatedUser, PostCreateRequest request) {
        PostEntity post = new PostEntity();
        post.setAuthorId(authenticatedUser.userId());
        post.setType("TEXT");
        post.setText(request.text().trim());
        post.setVisibility(normalizeVisibility(request.visibility()));
        post.setImageUrl(blankToNull(request.imageUrl()));
        post.setModerationStatus(VISIBLE);
        post.setCreatedAt(Instant.now());
        PostEntity saved = postRepository.save(post);
        achievementApplicationService.awardFirstPost(authenticatedUser.userId());
        return mapSinglePost(saved, authenticatedUser, Map.of(saved.getAuthorId(), loadUser(saved.getAuthorId())));
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
        comment.setModerationStatus(VISIBLE);
        comment.setCreatedAt(Instant.now());
        CommentEntity saved = commentRepository.save(comment);
        achievementApplicationService.awardFirstComment(authenticatedUser.userId());

        UserEntity author = loadUser(authenticatedUser.userId());
        return new CommunityCommentResponse(
                saved.getId(),
                author.getId(),
                displayName(author),
                author.getNickname(),
                author.getAvatarUrl(),
                saved.getText(),
                saved.getModerationStatus(),
                saved.getModerationNote(),
                saved.getCreatedAt(),
                List.of()
        );
    }

    @Transactional
    public CommunityPostResponse setReaction(AuthenticatedUser authenticatedUser, Long postId, PostReactionRequest request) {
        PostEntity post = postRepository.findById(postId).orElseThrow(() -> new ResourceNotFoundException("Post was not found"));
        String reaction = normalizeReaction(request.reaction());
        boolean shouldNotifyRecommendation = false;
        boolean reactionApplied = false;

        Optional<PostReactionEntity> existingReaction = postReactionRepository.findByPostIdAndUserId(postId, authenticatedUser.userId());
        if (existingReaction.isPresent()) {
            PostReactionEntity entity = existingReaction.get();
            if (reaction.equals(entity.getReaction())) {
                postReactionRepository.delete(entity);
            } else {
                shouldNotifyRecommendation = DEFAULT_REACTION.equals(reaction) && !DEFAULT_REACTION.equals(entity.getReaction());
                entity.setReaction(reaction);
                entity.setCreatedAt(Instant.now());
                postReactionRepository.save(entity);
                reactionApplied = true;
            }
        } else {
            PostReactionEntity entity = new PostReactionEntity();
            entity.setPostId(postId);
            entity.setUserId(authenticatedUser.userId());
            entity.setReaction(reaction);
            entity.setCreatedAt(Instant.now());
            postReactionRepository.save(entity);
            shouldNotifyRecommendation = DEFAULT_REACTION.equals(reaction);
            reactionApplied = true;
        }

        if (reactionApplied) {
            achievementApplicationService.awardFirstReaction(authenticatedUser.userId());
        }

        if (shouldNotifyRecommendation && !authenticatedUser.userId().equals(post.getAuthorId())) {
            UserEntity actor = loadUser(authenticatedUser.userId());
            notificationApplicationService.notifyBlogRecommendation(
                    post.getAuthorId(),
                    actor.getId(),
                    displayName(actor),
                    buildPostLabel(post),
                    "/home"
            );
        }

        return mapSinglePost(post, authenticatedUser, Map.of(post.getAuthorId(), loadUser(post.getAuthorId())));
    }

    @Transactional
    public CommunityPostResponse toggleLike(AuthenticatedUser authenticatedUser, Long postId) {
        return setReaction(authenticatedUser, postId, new PostReactionRequest(DEFAULT_REACTION));
    }

    public List<CommunityCommentResponse> getChallengeDiscussion(AuthenticatedUser authenticatedUser, Long challengeId) {
        ensureChallengeExists(challengeId);
        List<CommentEntity> comments = commentRepository.findByChallengeIdAndModerationStatusInOrderByCreatedAtAsc(challengeId, FEED_STATUSES);
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
        comment.setModerationStatus(VISIBLE);
        comment.setCreatedAt(Instant.now());
        CommentEntity saved = commentRepository.save(comment);
        achievementApplicationService.awardFirstComment(authenticatedUser.userId());

        UserEntity author = loadUser(authenticatedUser.userId());
        return new CommunityCommentResponse(
                saved.getId(),
                author.getId(),
                displayName(author),
                author.getNickname(),
                author.getAvatarUrl(),
                saved.getText(),
                saved.getModerationStatus(),
                saved.getModerationNote(),
                saved.getCreatedAt(),
                List.of()
        );
    }

    private Page<CommunityPostResponse> mapPosts(Page<PostEntity> page, AuthenticatedUser authenticatedUser) {
        List<PostEntity> posts = page.getContent();
        List<Long> authorIds = posts.stream().map(PostEntity::getAuthorId).distinct().toList();
        Map<Long, UserEntity> users = loadUsers(authorIds);
        List<Long> postIds = posts.stream().map(PostEntity::getId).toList();
        Map<Long, String> currentUserReactions = postIds.isEmpty()
                ? Map.of()
                : postReactionRepository.findByPostIdInAndUserId(postIds, authenticatedUser.userId()).stream()
                .collect(Collectors.toMap(PostReactionEntity::getPostId, PostReactionEntity::getReaction));
        Map<Long, Map<String, Long>> reactionCountsByPost = buildReactionCountsByPost(postReactionRepository.findByPostIdIn(postIds));

        return page.map(post -> toPostResponse(post, authenticatedUser, users, currentUserReactions, reactionCountsByPost));
    }

    private CommunityPostResponse mapSinglePost(PostEntity post, AuthenticatedUser authenticatedUser, Map<Long, UserEntity> users) {
        Long postId = post.getId();
        Map<Long, String> currentUserReactions = postReactionRepository.findByPostIdAndUserId(postId, authenticatedUser.userId())
                .map(reaction -> Map.of(postId, reaction.getReaction()))
                .orElseGet(Map::of);
        Map<Long, Map<String, Long>> reactionCountsByPost = buildReactionCountsByPost(postReactionRepository.findByPostId(postId));
        return toPostResponse(post, authenticatedUser, users, currentUserReactions, reactionCountsByPost);
    }

    private CommunityPostResponse toPostResponse(
            PostEntity post,
            AuthenticatedUser authenticatedUser,
            Map<Long, UserEntity> users,
            Map<Long, String> currentUserReactions,
            Map<Long, Map<String, Long>> reactionCountsByPost
    ) {
        List<CommentEntity> comments = commentRepository.findByPostIdAndModerationStatusInOrderByCreatedAtAsc(post.getId(), FEED_STATUSES);
        Map<Long, UserEntity> commentUsers = enrichUsersForComments(users, comments);
        String currentReaction = currentUserReactions.get(post.getId());
        Map<String, Long> reactionCounts = reactionCountsByPost.getOrDefault(post.getId(), emptyReactionCounts());

        return new CommunityPostResponse(
                post.getId(),
                post.getAuthorId(),
                displayName(users.get(post.getAuthorId())),
                nickname(users.get(post.getAuthorId())),
                avatarUrl(users.get(post.getAuthorId())),
                post.getText(),
                post.getImageUrl(),
                post.getVisibility(),
                post.getModerationStatus(),
                post.getModerationNote(),
                post.getCreatedAt(),
                reactionCounts.getOrDefault(DEFAULT_REACTION, 0L),
                DEFAULT_REACTION.equals(currentReaction),
                currentReaction,
                reactionCounts,
                buildCommentTree(comments, commentUsers)
        );
    }

    private Map<Long, Map<String, Long>> buildReactionCountsByPost(List<PostReactionEntity> reactions) {
        if (reactions == null || reactions.isEmpty()) {
            return Map.of();
        }

        Map<Long, Map<String, Long>> result = new HashMap<>();
        for (PostReactionEntity reaction : reactions) {
            Map<String, Long> counts = result.computeIfAbsent(reaction.getPostId(), ignored -> emptyReactionCountsMutable());
            counts.compute(reaction.getReaction(), (key, value) -> value == null ? 1L : value + 1L);
        }
        return result;
    }

    private Map<String, Long> emptyReactionCounts() {
        return Map.of("like", 0L, "fire", 0L, "clap", 0L);
    }

    private Map<String, Long> emptyReactionCountsMutable() {
        Map<String, Long> counts = new LinkedHashMap<>();
        counts.put("like", 0L);
        counts.put("fire", 0L);
        counts.put("clap", 0L);
        return counts;
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

    private String normalizeReaction(String reaction) {
        String normalized = reaction == null ? DEFAULT_REACTION : reaction.trim().toLowerCase();
        if (!ALLOWED_REACTIONS.contains(normalized)) {
            throw new ConflictException("Reaction must be like, fire or clap");
        }
        return normalized;
    }

    private String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    private String buildPostLabel(PostEntity post) {
        String text = blankToNull(post.getText());
        if (text == null) {
            return "без названия";
        }
        String normalized = text.replaceAll("\\s+", " ").trim();
        return normalized.length() > 42 ? normalized.substring(0, 39) + "..." : normalized;
    }

    private UserEntity loadUser(Long userId) {
        return userRepository.findById(userId).orElseThrow(() -> new ResourceNotFoundException("User was not found"));
    }

    private Map<Long, UserEntity> loadUsers(Collection<Long> userIds) {
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
                avatarUrl(author),
                comment.getText(),
                comment.getModerationStatus(),
                comment.getModerationNote(),
                comment.getCreatedAt(),
                replies
        );
    }

    private String displayName(UserEntity user) {
        if (user == null) {
            return "Р В РЎСџР В РЎвЂўР В Р’В»Р РЋР Р‰Р В Р’В·Р В РЎвЂўР В Р вЂ Р В Р’В°Р РЋРІР‚С™Р В Р’ВµР В Р’В»Р РЋР Р‰";
        }
        if (user.getFirstName() != null && !user.getFirstName().isBlank()) {
            return user.getFirstName();
        }
        return user.getNickname();
    }

    private String avatarUrl(UserEntity user) {
        return user == null ? null : user.getAvatarUrl();
    }

    private String nickname(UserEntity user) {
        return user == null ? "user" : user.getNickname();
    }
}
