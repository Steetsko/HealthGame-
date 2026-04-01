package com.healthgame.backend.challenges.application;

import com.healthgame.backend.achievements.application.AchievementApplicationService;
import com.healthgame.backend.challenges.infrastructure.persistence.ChallengeEntity;
import com.healthgame.backend.challenges.infrastructure.persistence.ChallengeParticipantEntity;
import com.healthgame.backend.challenges.infrastructure.persistence.ChallengeParticipantRepository;
import com.healthgame.backend.challenges.infrastructure.persistence.ChallengeProgressEntity;
import com.healthgame.backend.challenges.infrastructure.persistence.ChallengeProgressRepository;
import com.healthgame.backend.challenges.infrastructure.persistence.ChallengeRepository;
import com.healthgame.backend.challenges.infrastructure.persistence.ChallengeTargetEntity;
import com.healthgame.backend.challenges.infrastructure.persistence.ChallengeTargetRepository;
import com.healthgame.backend.habits.infrastructure.persistence.HabitCategoryEntity;
import com.healthgame.backend.habits.infrastructure.persistence.HabitCategoryRepository;
import com.healthgame.backend.habits.infrastructure.persistence.HabitCheckinEntity;
import com.healthgame.backend.habits.infrastructure.persistence.HabitEntity;
import com.healthgame.backend.habits.infrastructure.persistence.HabitRepository;
import com.healthgame.backend.identity.infrastructure.persistence.UserEntity;
import com.healthgame.backend.identity.infrastructure.persistence.UserRepository;
import com.healthgame.backend.identity.infrastructure.security.AuthenticatedUser;
import com.healthgame.backend.shared.domain.ConflictException;
import com.healthgame.backend.shared.domain.ResourceNotFoundException;
import jakarta.transaction.Transactional;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

@Service
public class ChallengeApplicationService {

    private final ChallengeRepository challengeRepository;
    private final ChallengeParticipantRepository challengeParticipantRepository;
    private final ChallengeTargetRepository challengeTargetRepository;
    private final ChallengeProgressRepository challengeProgressRepository;
    private final UserRepository userRepository;
    private final HabitRepository habitRepository;
    private final HabitCategoryRepository habitCategoryRepository;
    private final AchievementApplicationService achievementApplicationService;
    private final ChallengeProgressService challengeProgressService;

    public ChallengeApplicationService(
            ChallengeRepository challengeRepository,
            ChallengeParticipantRepository challengeParticipantRepository,
            ChallengeTargetRepository challengeTargetRepository,
            ChallengeProgressRepository challengeProgressRepository,
            UserRepository userRepository,
            HabitRepository habitRepository,
            HabitCategoryRepository habitCategoryRepository,
            AchievementApplicationService achievementApplicationService,
            ChallengeProgressService challengeProgressService
    ) {
        this.challengeRepository = challengeRepository;
        this.challengeParticipantRepository = challengeParticipantRepository;
        this.challengeTargetRepository = challengeTargetRepository;
        this.challengeProgressRepository = challengeProgressRepository;
        this.userRepository = userRepository;
        this.habitRepository = habitRepository;
        this.habitCategoryRepository = habitCategoryRepository;
        this.achievementApplicationService = achievementApplicationService;
        this.challengeProgressService = challengeProgressService;
    }

    public Page<ChallengeSummaryResponse> listChallenges(AuthenticatedUser authenticatedUser, String scope, Pageable pageable) {
        String normalizedScope = scope == null ? "MY" : scope.trim().toUpperCase();
        Page<ChallengeEntity> page = switch (normalizedScope) {
            case "MY" -> challengeRepository.findForUser(authenticatedUser.userId(), pageable);
            case "PUBLIC" -> challengeRepository.findPublicVisible("CANCELLED", pageable);
            default -> throw new ConflictException("Challenge scope must be MY or PUBLIC");
        };

        List<Long> challengeIds = page.getContent().stream().map(ChallengeEntity::getId).toList();
        Map<Long, ChallengeParticipantEntity> currentParticipants = challengeIds.isEmpty()
                ? Map.of()
                : challengeParticipantRepository.findByChallengeIdInAndUserId(challengeIds, authenticatedUser.userId()).stream()
                .collect(Collectors.toMap(ChallengeParticipantEntity::getChallengeId, Function.identity()));
        Map<Long, ChallengeProgressEntity> currentProgress = challengeIds.isEmpty()
                ? Map.of()
                : challengeProgressRepository.findByChallengeIdInAndUserId(challengeIds, authenticatedUser.userId()).stream()
                .collect(Collectors.toMap(ChallengeProgressEntity::getChallengeId, Function.identity()));
        Map<Long, Long> acceptedParticipantsCount = challengeIds.isEmpty()
                ? Map.of()
                : challengeParticipantRepository.findByChallengeIdIn(challengeIds).stream()
                .filter(participant -> "ACCEPTED".equals(participant.getParticipantStatus()))
                .collect(Collectors.groupingBy(ChallengeParticipantEntity::getChallengeId, Collectors.counting()));

        return page.map(challenge -> new ChallengeSummaryResponse(
                challenge.getId(),
                challenge.getName(),
                challenge.getDescription(),
                challenge.getStartDate(),
                challenge.getEndDate(),
                challenge.getGoalType(),
                challenge.getGoalValue(),
                challenge.getStatus(),
                challenge.isPublic(),
                currentParticipants.containsKey(challenge.getId()) ? currentParticipants.get(challenge.getId()).getParticipantStatus() : null,
                currentProgress.containsKey(challenge.getId()) ? currentProgress.get(challenge.getId()).getCurrentValue() : 0,
                currentProgress.containsKey(challenge.getId()) ? currentProgress.get(challenge.getId()).getCompletionPercent() : zeroPercent(),
                acceptedParticipantsCount.getOrDefault(challenge.getId(), 0L).intValue(),
                challenge.getCoverImageUrl()
        ));
    }

    @Transactional
    public ChallengeDetailsResponse createChallenge(AuthenticatedUser authenticatedUser, ChallengeCreateRequest request) {
        UserEntity user = userRepository.findById(authenticatedUser.userId())
                .orElseThrow(() -> new ResourceNotFoundException("Authenticated user was not found"));
        validateDates(request.startDate(), request.endDate());
        String goalType = validateGoalType(request.goalType());

        ChallengeEntity challenge = new ChallengeEntity();
        challenge.setCreatorId(authenticatedUser.userId());
        challenge.setName(request.name().trim());
        challenge.setDescription(request.description());
        challenge.setStartDate(request.startDate());
        challenge.setEndDate(request.endDate());
        challenge.setGoalType(goalType);
        challenge.setGoalValue(request.goalValue());
        challenge.setPublic(Boolean.TRUE.equals(request.isPublic()));
        challenge.setCoverImageUrl(request.coverImageUrl());
        challenge.setStatus(resolveInitialStatus(user.getTimezone(), request.startDate()));

        ChallengeEntity saved = challengeRepository.save(challenge);
        challengeTargetRepository.saveAll(request.targets().stream().map(target -> toTargetEntity(saved.getId(), authenticatedUser.userId(), target)).toList());

        Instant now = Instant.now();
        ChallengeParticipantEntity organizer = new ChallengeParticipantEntity();
        organizer.setChallengeId(saved.getId());
        organizer.setUserId(authenticatedUser.userId());
        organizer.setParticipantRole("ORGANIZER");
        organizer.setParticipantStatus("ACCEPTED");
        organizer.setJoinedAt(now);
        organizer.setRespondedAt(now);
        challengeParticipantRepository.save(organizer);

        challengeProgressService.recalculateProgress(saved.getId(), authenticatedUser.userId());
        return buildDetails(saved, authenticatedUser.userId());
    }

    public ChallengeDetailsResponse getChallenge(AuthenticatedUser authenticatedUser, Long challengeId) {
        ChallengeEntity challenge = getAccessibleChallenge(authenticatedUser.userId(), challengeId);
        return buildDetails(challenge, authenticatedUser.userId());
    }

    public List<ChallengeParticipantResponse> getParticipants(AuthenticatedUser authenticatedUser, Long challengeId) {
        ChallengeEntity challenge = getAccessibleChallenge(authenticatedUser.userId(), challengeId);
        return buildParticipantResponses(challenge.getId());
    }

    @Transactional
    public ChallengeDetailsResponse inviteParticipant(AuthenticatedUser authenticatedUser, Long challengeId, ChallengeInviteRequest request) {
        ChallengeEntity challenge = challengeRepository.findById(challengeId)
                .orElseThrow(() -> new ResourceNotFoundException("Challenge was not found"));
        ensureOrganizer(authenticatedUser.userId(), challenge);
        if ("FINISHED".equals(challenge.getStatus()) || "CANCELLED".equals(challenge.getStatus())) {
            throw new ConflictException("Cannot invite users to finished or cancelled challenge");
        }

        UserEntity invitee = userRepository.findByEmailIgnoreCase(request.email())
                .orElseThrow(() -> new ResourceNotFoundException("Invitee user was not found"));
        if (invitee.getId().equals(challenge.getCreatorId())) {
            throw new ConflictException("Challenge creator is already participating");
        }

        ChallengeParticipantEntity participant = challengeParticipantRepository.findByChallengeIdAndUserId(challengeId, invitee.getId())
                .orElseGet(ChallengeParticipantEntity::new);
        if ("ACCEPTED".equals(participant.getParticipantStatus())) {
            throw new ConflictException("User is already participating in this challenge");
        }
        if ("INVITED".equals(participant.getParticipantStatus())) {
            throw new ConflictException("User has already been invited to this challenge");
        }

        Instant now = Instant.now();
        participant.setChallengeId(challengeId);
        participant.setUserId(invitee.getId());
        participant.setParticipantRole("PARTICIPANT");
        participant.setParticipantStatus("INVITED");
        participant.setInvitedBy(authenticatedUser.userId());
        participant.setInvitedAt(now);
        participant.setJoinedAt(now);
        participant.setRespondedAt(null);
        challengeParticipantRepository.save(participant);

        return buildDetails(challenge, authenticatedUser.userId());
    }

    @Transactional
    public ChallengeDetailsResponse respondToInvite(AuthenticatedUser authenticatedUser, Long challengeId, ChallengeInviteDecisionRequest request) {
        ChallengeEntity challenge = challengeRepository.findById(challengeId)
                .orElseThrow(() -> new ResourceNotFoundException("Challenge was not found"));
        ChallengeParticipantEntity participant = challengeParticipantRepository.findByChallengeIdAndUserId(challengeId, authenticatedUser.userId())
                .orElseThrow(() -> new ResourceNotFoundException("Challenge invite was not found"));
        if (!"INVITED".equals(participant.getParticipantStatus())) {
            throw new ConflictException("Only pending invites can be responded to");
        }

        Instant now = Instant.now();
        if (request.accept()) {
            participant.setParticipantStatus("ACCEPTED");
            participant.setRespondedAt(now);
            participant.setJoinedAt(now);
            challengeParticipantRepository.save(participant);
            challengeProgressService.recalculateProgress(challengeId, authenticatedUser.userId());
            achievementApplicationService.awardChallengeJoiner(authenticatedUser.userId());
        } else {
            participant.setParticipantStatus("DECLINED");
            participant.setRespondedAt(now);
            challengeParticipantRepository.save(participant);
        }

        return buildDetails(challenge, authenticatedUser.userId());
    }

    @Transactional
    public ChallengeDetailsResponse joinChallenge(AuthenticatedUser authenticatedUser, Long challengeId) {
        ChallengeEntity challenge = challengeRepository.findById(challengeId)
                .orElseThrow(() -> new ResourceNotFoundException("Challenge was not found"));
        if (!challenge.isPublic()) {
            throw new ConflictException("Only public challenges can be joined directly");
        }
        if (!"ACTIVE".equals(challenge.getStatus())) {
            throw new ConflictException("Only active challenges can be joined");
        }
        if (challenge.getCreatorId().equals(authenticatedUser.userId())) {
            throw new ConflictException("Challenge creator is already participating");
        }

        Instant now = Instant.now();
        ChallengeParticipantEntity participant = challengeParticipantRepository.findByChallengeIdAndUserId(challengeId, authenticatedUser.userId())
                .orElseGet(ChallengeParticipantEntity::new);
        participant.setChallengeId(challengeId);
        participant.setUserId(authenticatedUser.userId());
        participant.setParticipantRole("PARTICIPANT");
        participant.setParticipantStatus("ACCEPTED");
        participant.setJoinedAt(now);
        participant.setRespondedAt(now);
        challengeParticipantRepository.save(participant);

        challengeProgressService.recalculateProgress(challengeId, authenticatedUser.userId());
        achievementApplicationService.awardChallengeJoiner(authenticatedUser.userId());
        return buildDetails(challenge, authenticatedUser.userId());
    }

    @Transactional
    public void leaveChallenge(AuthenticatedUser authenticatedUser, Long challengeId) {
        ChallengeEntity challenge = challengeRepository.findById(challengeId)
                .orElseThrow(() -> new ResourceNotFoundException("Challenge was not found"));
        ChallengeParticipantEntity participant = challengeParticipantRepository.findByChallengeIdAndUserId(challengeId, authenticatedUser.userId())
                .orElseThrow(() -> new ResourceNotFoundException("Challenge participant was not found"));
        if (!"ACCEPTED".equals(participant.getParticipantStatus())) {
            throw new ConflictException("Only accepted participants can leave a challenge");
        }
        if (challenge.getCreatorId().equals(authenticatedUser.userId()) || "ORGANIZER".equals(participant.getParticipantRole())) {
            throw new ConflictException("Challenge organizer cannot leave their own challenge");
        }

        participant.setParticipantStatus("LEFT");
        participant.setRespondedAt(Instant.now());
        challengeParticipantRepository.save(participant);
        challengeProgressRepository.findByChallengeIdAndUserId(challengeId, authenticatedUser.userId())
                .ifPresent(challengeProgressRepository::delete);
    }

    @Transactional
    public void handleHabitCheckinCreated(Long userId, HabitEntity habit, HabitCheckinEntity checkin) {
        List<ChallengeParticipantEntity> participations = challengeParticipantRepository.findByUserIdAndParticipantStatus(userId, "ACCEPTED");
        if (participations.isEmpty()) {
            return;
        }

        List<Long> challengeIds = participations.stream().map(ChallengeParticipantEntity::getChallengeId).toList();
        List<ChallengeEntity> challenges = challengeRepository.findAllById(challengeIds);

        for (ChallengeEntity challenge : challenges) {
            if (!"ACTIVE".equals(challenge.getStatus())) {
                continue;
            }
            if (checkin.getCheckinDate().isBefore(challenge.getStartDate()) || checkin.getCheckinDate().isAfter(challenge.getEndDate())) {
                continue;
            }
            if (challengeProgressService.matchesChallenge(challenge.getId(), habit)) {
                challengeProgressService.recalculateProgress(challenge.getId(), userId);
            }
        }
    }

    private ChallengeEntity getAccessibleChallenge(Long userId, Long challengeId) {
        return challengeRepository.findAccessibleById(challengeId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Challenge was not found"));
    }

    private void ensureOrganizer(Long userId, ChallengeEntity challenge) {
        if (challenge.getCreatorId().equals(userId)) {
            return;
        }
        ChallengeParticipantEntity participant = challengeParticipantRepository.findByChallengeIdAndUserId(challenge.getId(), userId)
                .orElseThrow(() -> new ConflictException("Only challenge organizer can manage invitations"));
        if (!"ACCEPTED".equals(participant.getParticipantStatus()) || !"ORGANIZER".equals(participant.getParticipantRole())) {
            throw new ConflictException("Only challenge organizer can manage invitations");
        }
    }

    private ChallengeDetailsResponse buildDetails(ChallengeEntity challenge, Long currentUserId) {
        List<ChallengeTargetEntity> targetEntities = challengeTargetRepository.findByChallengeId(challenge.getId());
        List<ChallengeParticipantEntity> participantEntities = challengeParticipantRepository.findByChallengeId(challenge.getId());
        ChallengeParticipantEntity currentParticipant = participantEntities.stream()
                .filter(participant -> participant.getUserId().equals(currentUserId))
                .findFirst()
                .orElse(null);
        ChallengeProgressEntity currentProgress = challengeProgressRepository.findByChallengeIdAndUserId(challenge.getId(), currentUserId).orElse(null);

        return new ChallengeDetailsResponse(
                challenge.getId(),
                challenge.getCreatorId(),
                challenge.getName(),
                challenge.getDescription(),
                challenge.getStartDate(),
                challenge.getEndDate(),
                challenge.getGoalType(),
                challenge.getGoalValue(),
                challenge.getStatus(),
                challenge.isPublic(),
                currentParticipant != null ? currentParticipant.getParticipantStatus() : null,
                currentParticipant != null ? currentParticipant.getParticipantRole() : null,
                challenge.getCoverImageUrl(),
                buildTargetResponses(targetEntities),
                buildParticipantResponses(challenge.getId()),
                currentProgress != null
                        ? new ChallengeProgressResponse(currentProgress.getCurrentValue(), currentProgress.getCompletionPercent(), currentProgress.getLastCheckinDate(), currentProgress.getCompletedAt())
                        : new ChallengeProgressResponse(0, zeroPercent(), null, null)
        );
    }

    @Transactional
    public void deleteChallenge(AuthenticatedUser authenticatedUser, Long challengeId) {
        ChallengeEntity challenge = challengeRepository.findById(challengeId)
                .orElseThrow(() -> new ResourceNotFoundException("Challenge was not found"));
        // Удалять может только создатель/организатор.
        if (!challenge.getCreatorId().equals(authenticatedUser.userId())) {
            ChallengeParticipantEntity participant = challengeParticipantRepository.findByChallengeIdAndUserId(challengeId, authenticatedUser.userId())
                    .orElseThrow(() -> new ConflictException("Only challenge organizer can delete a challenge"));
            if (!"ORGANIZER".equals(participant.getParticipantRole()) || !"ACCEPTED".equals(participant.getParticipantStatus())) {
                throw new ConflictException("Only challenge organizer can delete a challenge");
            }
        }
        challengeRepository.delete(challenge);
    }

    private List<ChallengeParticipantResponse> buildParticipantResponses(Long challengeId) {
        List<ChallengeParticipantEntity> participantEntities = challengeParticipantRepository.findByChallengeId(challengeId);
        Map<Long, UserEntity> users = userRepository.findAllById(participantEntities.stream().map(ChallengeParticipantEntity::getUserId).collect(Collectors.toSet()))
                .stream()
                .collect(Collectors.toMap(UserEntity::getId, Function.identity()));

        return participantEntities.stream()
                .sorted(Comparator.comparing(ChallengeParticipantEntity::getJoinedAt, Comparator.nullsLast(Comparator.naturalOrder())))
                .map(participant -> new ChallengeParticipantResponse(
                        participant.getUserId(),
                        users.containsKey(participant.getUserId()) ? users.get(participant.getUserId()).getEmail() : null,
                        users.containsKey(participant.getUserId()) ? users.get(participant.getUserId()).getNickname() : null,
                        participant.getParticipantRole(),
                        participant.getParticipantStatus(),
                        participant.getJoinedAt()
                ))
                .toList();
    }

    private List<ChallengeTargetResponse> buildTargetResponses(List<ChallengeTargetEntity> targetEntities) {
        Map<Integer, HabitCategoryEntity> categories = habitCategoryRepository.findAllById(targetEntities.stream().map(ChallengeTargetEntity::getCategoryId).filter(Objects::nonNull).collect(Collectors.toSet()))
                .stream()
                .collect(Collectors.toMap(HabitCategoryEntity::getId, Function.identity()));

        return targetEntities.stream()
                .map(target -> new ChallengeTargetResponse(
                        target.getId(),
                        target.getTargetKind(),
                        target.getHabitId(),
                        target.getCategoryId(),
                        target.getCategoryId() != null && categories.containsKey(target.getCategoryId()) ? categories.get(target.getCategoryId()).getName() : null,
                        target.getUnit()
                ))
                .toList();
    }

    private ChallengeTargetEntity toTargetEntity(Long challengeId, Long creatorId, ChallengeTargetRequest request) {
        String targetKind = request.targetKind().trim().toUpperCase();
        ChallengeTargetEntity entity = new ChallengeTargetEntity();
        entity.setChallengeId(challengeId);
        entity.setTargetKind(targetKind);

        switch (targetKind) {
            case "HABIT" -> {
                if (request.habitId() == null || request.categoryId() != null || request.unit() != null) {
                    throw new ConflictException("HABIT target must contain only habitId");
                }
                HabitEntity habit = habitRepository.findByIdAndUserId(request.habitId(), creatorId)
                        .orElseThrow(() -> new ResourceNotFoundException("Challenge target habit was not found"));
                entity.setHabitId(habit.getId());
            }
            case "CATEGORY" -> {
                if (request.categoryId() == null || request.habitId() != null || request.unit() != null) {
                    throw new ConflictException("CATEGORY target must contain only categoryId");
                }
                habitCategoryRepository.findById(request.categoryId())
                        .orElseThrow(() -> new ResourceNotFoundException("Challenge target category was not found"));
                entity.setCategoryId(request.categoryId());
            }
            case "UNIT" -> {
                if (request.unit() == null || request.unit().isBlank() || request.habitId() != null || request.categoryId() != null) {
                    throw new ConflictException("UNIT target must contain only unit");
                }
                entity.setUnit(request.unit().trim());
            }
            default -> throw new ConflictException("Challenge target kind must be HABIT, CATEGORY or UNIT");
        }

        return entity;
    }

    private void validateDates(LocalDate startDate, LocalDate endDate) {
        if (endDate.isBefore(startDate)) {
            throw new ConflictException("Challenge end date cannot be before start date");
        }
    }

    private String validateGoalType(String goalType) {
        String normalized = goalType == null ? "" : goalType.trim().toUpperCase();
        if (!List.of("SUM_VALUE", "DAYS_COUNT", "STREAK").contains(normalized)) {
            throw new ConflictException("Challenge goal type must be SUM_VALUE, DAYS_COUNT or STREAK");
        }
        return normalized;
    }

    private String resolveInitialStatus(String timezone, LocalDate startDate) {
        LocalDate today = LocalDate.now(ZoneId.of(timezone));
        return startDate.isAfter(today) ? "DRAFT" : "ACTIVE";
    }

    private BigDecimal zeroPercent() {
        return BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
    }
}