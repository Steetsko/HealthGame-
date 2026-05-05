package com.healthgame.backend.challenges.application;

import java.time.LocalDate;
import java.util.List;

public class ChallengeDetailsResponseBuilder {

    private Long id;
    private Long creatorId;
    private String name;
    private String description;
    private LocalDate startDate;
    private LocalDate endDate;
    private String goalType;
    private Integer goalValue;
    private Integer xpReward;
    private String status;
    private boolean isPublic;
    private String currentUserParticipantStatus;
    private String currentUserParticipantRole;
    private String coverImageUrl;
    private List<ChallengeTargetResponse> targets = List.of();
    private List<ChallengeParticipantResponse> participants = List.of();
    private ChallengeProgressResponse currentUserProgress;

    public ChallengeDetailsResponseBuilder id(Long id) {
        this.id = id;
        return this;
    }

    public ChallengeDetailsResponseBuilder creatorId(Long creatorId) {
        this.creatorId = creatorId;
        return this;
    }

    public ChallengeDetailsResponseBuilder name(String name) {
        this.name = name;
        return this;
    }

    public ChallengeDetailsResponseBuilder description(String description) {
        this.description = description;
        return this;
    }

    public ChallengeDetailsResponseBuilder startDate(LocalDate startDate) {
        this.startDate = startDate;
        return this;
    }

    public ChallengeDetailsResponseBuilder endDate(LocalDate endDate) {
        this.endDate = endDate;
        return this;
    }

    public ChallengeDetailsResponseBuilder goalType(String goalType) {
        this.goalType = goalType;
        return this;
    }

    public ChallengeDetailsResponseBuilder goalValue(Integer goalValue) {
        this.goalValue = goalValue;
        return this;
    }

    public ChallengeDetailsResponseBuilder xpReward(Integer xpReward) {
        this.xpReward = xpReward;
        return this;
    }

    public ChallengeDetailsResponseBuilder status(String status) {
        this.status = status;
        return this;
    }

    public ChallengeDetailsResponseBuilder isPublic(boolean isPublic) {
        this.isPublic = isPublic;
        return this;
    }

    public ChallengeDetailsResponseBuilder currentUserParticipantStatus(String currentUserParticipantStatus) {
        this.currentUserParticipantStatus = currentUserParticipantStatus;
        return this;
    }

    public ChallengeDetailsResponseBuilder currentUserParticipantRole(String currentUserParticipantRole) {
        this.currentUserParticipantRole = currentUserParticipantRole;
        return this;
    }

    public ChallengeDetailsResponseBuilder coverImageUrl(String coverImageUrl) {
        this.coverImageUrl = coverImageUrl;
        return this;
    }

    public ChallengeDetailsResponseBuilder targets(List<ChallengeTargetResponse> targets) {
        this.targets = targets;
        return this;
    }

    public ChallengeDetailsResponseBuilder participants(List<ChallengeParticipantResponse> participants) {
        this.participants = participants;
        return this;
    }

    public ChallengeDetailsResponseBuilder currentUserProgress(ChallengeProgressResponse currentUserProgress) {
        this.currentUserProgress = currentUserProgress;
        return this;
    }

    public ChallengeDetailsResponse build() {
        return new ChallengeDetailsResponse(
                id,
                creatorId,
                name,
                description,
                startDate,
                endDate,
                goalType,
                goalValue,
                xpReward,
                status,
                isPublic,
                currentUserParticipantStatus,
                currentUserParticipantRole,
                coverImageUrl,
                targets,
                participants,
                currentUserProgress
        );
    }
}
