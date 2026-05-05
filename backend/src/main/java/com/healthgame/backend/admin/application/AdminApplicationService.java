package com.healthgame.backend.admin.application;

import com.healthgame.backend.challenges.infrastructure.persistence.ChallengeEntity;
import com.healthgame.backend.challenges.infrastructure.persistence.ChallengeRepository;
import com.healthgame.backend.community.infrastructure.persistence.CommentEntity;
import com.healthgame.backend.community.infrastructure.persistence.CommentRepository;
import com.healthgame.backend.community.infrastructure.persistence.PostEntity;
import com.healthgame.backend.community.infrastructure.persistence.PostRepository;
import com.healthgame.backend.identity.infrastructure.persistence.UserEntity;
import com.healthgame.backend.identity.infrastructure.persistence.UserRepository;
import com.healthgame.backend.identity.infrastructure.persistence.UserRoleJdbcRepository;
import com.healthgame.backend.identity.infrastructure.security.AuthenticatedUser;
import com.healthgame.backend.shared.domain.ConflictException;
import com.healthgame.backend.shared.domain.ResourceNotFoundException;
import jakarta.transaction.Transactional;
import java.time.Instant;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

@Service
public class AdminApplicationService {

    private static final Logger log = LoggerFactory.getLogger(AdminApplicationService.class);
    private static final List<String> ALLOWED_MODERATION_STATUSES = List.of("VISIBLE", "HIDDEN", "REMOVED");

    private final ChallengeRepository challengeRepository;
    private final PostRepository postRepository;
    private final CommentRepository commentRepository;
    private final UserRepository userRepository;
    private final UserRoleJdbcRepository userRoleJdbcRepository;

    public AdminApplicationService(
            ChallengeRepository challengeRepository,
            PostRepository postRepository,
            CommentRepository commentRepository,
            UserRepository userRepository,
            UserRoleJdbcRepository userRoleJdbcRepository
    ) {
        this.challengeRepository = challengeRepository;
        this.postRepository = postRepository;
        this.commentRepository = commentRepository;
        this.userRepository = userRepository;
        this.userRoleJdbcRepository = userRoleJdbcRepository;
    }

    @Transactional
    public void moderateChallenge(AuthenticatedUser admin, Long challengeId, AdminModerationRequest request) {
        ChallengeEntity challenge = challengeRepository.findById(challengeId)
                .orElseThrow(() -> new ResourceNotFoundException("Challenge was not found"));
        applyModeration(challenge, admin.userId(), request);
        challengeRepository.save(challenge);
        log.info("Challenge moderated: challengeId={}, adminId={}, status={}", challengeId, admin.userId(), challenge.getModerationStatus());
    }

    @Transactional
    public void moderatePost(AuthenticatedUser admin, Long postId, AdminModerationRequest request) {
        PostEntity post = postRepository.findById(postId)
                .orElseThrow(() -> new ResourceNotFoundException("Post was not found"));
        applyModeration(post, admin.userId(), request);
        postRepository.save(post);
        log.info("Post moderated: postId={}, adminId={}, status={}", postId, admin.userId(), post.getModerationStatus());
    }

    @Transactional
    public void moderateComment(AuthenticatedUser admin, Long commentId, AdminModerationRequest request) {
        CommentEntity comment = commentRepository.findById(commentId)
                .orElseThrow(() -> new ResourceNotFoundException("Comment was not found"));
        applyModeration(comment, admin.userId(), request);
        commentRepository.save(comment);
        log.info("Comment moderated: commentId={}, adminId={}, status={}", commentId, admin.userId(), comment.getModerationStatus());
    }

    @Transactional
    public void blockUser(AuthenticatedUser admin, Long userId, AdminUserStatusRequest request) {
        if (admin.userId().equals(userId)) {
            throw new ConflictException("Administrator cannot block themselves");
        }
        UserEntity user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User was not found"));
        user.setStatus("blocked");
        userRepository.save(user);
        log.info("User blocked: userId={}, adminId={}, note={}", userId, admin.userId(), request.note());
    }

    @Transactional
    public void unblockUser(AuthenticatedUser admin, Long userId) {
        UserEntity user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User was not found"));
        user.setStatus("active");
        userRepository.save(user);
        log.info("User unblocked: userId={}, adminId={}", userId, admin.userId());
    }

    @Transactional
    public void grantAdminRole(AuthenticatedUser admin, Long userId) {
        if (admin.userId().equals(userId)) {
            throw new ConflictException("Admin role is already assigned to current administrator");
        }
        userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User was not found"));
        userRoleJdbcRepository.assignAdminRole(userId);
        log.info("Admin role granted: targetUserId={}, adminId={}", userId, admin.userId());
    }

    private void applyModeration(ChallengeEntity challenge, Long adminId, AdminModerationRequest request) {
        challenge.setModerationStatus(normalizeModerationStatus(request.moderationStatus()));
        challenge.setModeratedBy(adminId);
        challenge.setModeratedAt(Instant.now());
        challenge.setModerationNote(blankToNull(request.note()));
    }

    private void applyModeration(PostEntity post, Long adminId, AdminModerationRequest request) {
        post.setModerationStatus(normalizeModerationStatus(request.moderationStatus()));
        post.setModeratedBy(adminId);
        post.setModeratedAt(Instant.now());
        post.setModerationNote(blankToNull(request.note()));
    }

    private void applyModeration(CommentEntity comment, Long adminId, AdminModerationRequest request) {
        comment.setModerationStatus(normalizeModerationStatus(request.moderationStatus()));
        comment.setModeratedBy(adminId);
        comment.setModeratedAt(Instant.now());
        comment.setModerationNote(blankToNull(request.note()));
    }

    private String normalizeModerationStatus(String moderationStatus) {
        String normalized = moderationStatus == null ? "" : moderationStatus.trim().toUpperCase();
        if (!ALLOWED_MODERATION_STATUSES.contains(normalized)) {
            throw new ConflictException("Moderation status must be VISIBLE, HIDDEN or REMOVED");
        }
        return normalized;
    }

    private String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}