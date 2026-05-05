package com.healthgame.backend.challenges.application;

import jakarta.validation.Valid;
import jakarta.validation.constraints.FutureOrPresent;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;
import java.util.List;

public record ChallengeCreateRequest(
        @NotBlank @Size(max = 140) String name,
        @Size(max = 2000) String description,
        @NotNull @FutureOrPresent LocalDate startDate,
        @NotNull @FutureOrPresent LocalDate endDate,
        @NotBlank String goalType,
        @NotNull @Positive Integer goalValue,
        @NotNull @Positive Integer xpReward,
        Boolean isPublic,
        @Size(max = 2_000_000) String coverImageUrl,
        @Valid @NotEmpty List<ChallengeTargetRequest> targets
) {
}
