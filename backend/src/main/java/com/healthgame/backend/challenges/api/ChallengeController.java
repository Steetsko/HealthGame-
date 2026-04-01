package com.healthgame.backend.challenges.api;

import com.healthgame.backend.challenges.application.ChallengeApplicationService;
import com.healthgame.backend.challenges.application.ChallengeCreateRequest;
import com.healthgame.backend.challenges.application.ChallengeDetailsResponse;
import com.healthgame.backend.challenges.application.ChallengeInviteDecisionRequest;
import com.healthgame.backend.challenges.application.ChallengeInviteRequest;
import com.healthgame.backend.challenges.application.ChallengeParticipantResponse;
import com.healthgame.backend.challenges.application.ChallengeSummaryResponse;
import com.healthgame.backend.identity.infrastructure.security.AuthenticatedUser;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/challenges")
@SecurityRequirement(name = "bearerAuth")
public class ChallengeController {

    private final ChallengeApplicationService challengeApplicationService;

    public ChallengeController(ChallengeApplicationService challengeApplicationService) {
        this.challengeApplicationService = challengeApplicationService;
    }

    @Operation(summary = "List challenges for current user or public catalog")
    @GetMapping
    public Page<ChallengeSummaryResponse> list(
            @AuthenticationPrincipal AuthenticatedUser authenticatedUser,
            @Parameter(description = "Scope: MY or PUBLIC") @RequestParam(defaultValue = "MY") String scope,
            @Parameter(description = "Page number, starting from 0") @RequestParam(defaultValue = "0") int page,
            @Parameter(description = "Page size") @RequestParam(defaultValue = "20") int size,
            @Parameter(description = "Sort format: field,direction. Example: startDate,desc") @RequestParam(required = false) String sort
    ) {
        Pageable pageable = buildPageable(page, size, sort);
        return challengeApplicationService.listChallenges(authenticatedUser, scope, pageable);
    }

    @Operation(summary = "Create a challenge")
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ChallengeDetailsResponse create(
            @AuthenticationPrincipal AuthenticatedUser authenticatedUser,
            @Valid @RequestBody ChallengeCreateRequest request
    ) {
        return challengeApplicationService.createChallenge(authenticatedUser, request);
    }

    @Operation(summary = "Get challenge details")
    @GetMapping("/{challengeId}")
    public ChallengeDetailsResponse getById(
            @AuthenticationPrincipal AuthenticatedUser authenticatedUser,
            @PathVariable Long challengeId
    ) {
        return challengeApplicationService.getChallenge(authenticatedUser, challengeId);
    }

    @Operation(summary = "Get challenge participants")
    @GetMapping("/{challengeId}/participants")
    public List<ChallengeParticipantResponse> participants(
            @AuthenticationPrincipal AuthenticatedUser authenticatedUser,
            @PathVariable Long challengeId
    ) {
        return challengeApplicationService.getParticipants(authenticatedUser, challengeId);
    }

    @Operation(summary = "Invite a user to challenge by email")
    @PostMapping("/{challengeId}/invite")
    public ChallengeDetailsResponse invite(
            @AuthenticationPrincipal AuthenticatedUser authenticatedUser,
            @PathVariable Long challengeId,
            @Valid @RequestBody ChallengeInviteRequest request
    ) {
        return challengeApplicationService.inviteParticipant(authenticatedUser, challengeId, request);
    }

    @Operation(summary = "Respond to a challenge invite")
    @PostMapping("/{challengeId}/invite/respond")
    public ChallengeDetailsResponse respondInvite(
            @AuthenticationPrincipal AuthenticatedUser authenticatedUser,
            @PathVariable Long challengeId,
            @Valid @RequestBody ChallengeInviteDecisionRequest request
    ) {
        return challengeApplicationService.respondToInvite(authenticatedUser, challengeId, request);
    }

    @Operation(summary = "Join a public active challenge")
    @PostMapping("/{challengeId}/join")
    public ChallengeDetailsResponse join(
            @AuthenticationPrincipal AuthenticatedUser authenticatedUser,
            @PathVariable Long challengeId
    ) {
        return challengeApplicationService.joinChallenge(authenticatedUser, challengeId);
    }

    @Operation(summary = "Leave a challenge")
    @PostMapping("/{challengeId}/leave")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void leave(
            @AuthenticationPrincipal AuthenticatedUser authenticatedUser,
            @PathVariable Long challengeId
    ) {
        challengeApplicationService.leaveChallenge(authenticatedUser, challengeId);
    }

    @Operation(summary = "Delete a challenge (organizer only)")
    @DeleteMapping("/{challengeId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(
            @AuthenticationPrincipal AuthenticatedUser authenticatedUser,
            @PathVariable Long challengeId
    ) {
        challengeApplicationService.deleteChallenge(authenticatedUser, challengeId);
    }

    private Pageable buildPageable(int page, int size, String sort) {
        if (sort == null || sort.isBlank()) {
            return PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "id"));
        }

        String[] parts = sort.split(",", 2);
        String property = parts[0].trim();
        Sort.Direction direction = parts.length > 1
                ? Sort.Direction.fromOptionalString(parts[1].trim().toUpperCase()).orElse(Sort.Direction.ASC)
                : Sort.Direction.ASC;

        return PageRequest.of(page, size, Sort.by(direction, property));
    }
}