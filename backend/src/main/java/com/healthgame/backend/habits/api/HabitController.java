package com.healthgame.backend.habits.api;

import com.healthgame.backend.habits.application.HabitApplicationService;
import com.healthgame.backend.habits.application.HabitCheckinRequest;
import com.healthgame.backend.habits.application.HabitCheckinResponse;
import com.healthgame.backend.habits.application.HabitCreateRequest;
import com.healthgame.backend.habits.application.HabitResponse;
import com.healthgame.backend.habits.application.HabitTimelineDayResponse;
import com.healthgame.backend.habits.application.HabitUpdateRequest;
import com.healthgame.backend.habits.application.TodayHabitResponse;
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
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/habits")
@SecurityRequirement(name = "bearerAuth")
public class HabitController {

    private final HabitApplicationService habitApplicationService;

    public HabitController(HabitApplicationService habitApplicationService) {
        this.habitApplicationService = habitApplicationService;
    }

    @Operation(summary = "Get current user's habits with pagination")
    @GetMapping
    public Page<HabitResponse> list(
            @AuthenticationPrincipal AuthenticatedUser authenticatedUser,
            @Parameter(description = "Page number, starting from 0") @RequestParam(defaultValue = "0") int page,
            @Parameter(description = "Page size") @RequestParam(defaultValue = "20") int size,
            @Parameter(description = "Sort format: field,direction. Example: id,desc") @RequestParam(required = false) String sort
    ) {
        Pageable pageable = buildPageable(page, size, sort);
        return habitApplicationService.listHabits(authenticatedUser, pageable);
    }

    @Operation(summary = "Create a new habit for current user")
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public HabitResponse create(
            @AuthenticationPrincipal AuthenticatedUser authenticatedUser,
            @Valid @RequestBody HabitCreateRequest request
    ) {
        return habitApplicationService.createHabit(authenticatedUser, request);
    }

    @Operation(summary = "Update current user's habit")
    @PutMapping("/{habitId}")
    public HabitResponse update(
            @AuthenticationPrincipal AuthenticatedUser authenticatedUser,
            @PathVariable Long habitId,
            @Valid @RequestBody HabitUpdateRequest request
    ) {
        return habitApplicationService.updateHabit(authenticatedUser, habitId, request);
    }

    @Operation(summary = "Get current user's habit by id")
    @GetMapping("/{habitId}")
    public HabitResponse getById(
            @AuthenticationPrincipal AuthenticatedUser authenticatedUser,
            @PathVariable Long habitId
    ) {
        return habitApplicationService.getHabit(authenticatedUser, habitId);
    }

    @Operation(summary = "Get last days timeline for current user's habit")
    @GetMapping("/{habitId}/timeline")
    public List<HabitTimelineDayResponse> getTimeline(
            @AuthenticationPrincipal AuthenticatedUser authenticatedUser,
            @PathVariable Long habitId,
            @RequestParam(defaultValue = "7") int days
    ) {
        return habitApplicationService.getHabitTimeline(authenticatedUser, habitId, days);
    }

    @Operation(summary = "Get current user's habits planned for today")
    @GetMapping("/today")
    public List<TodayHabitResponse> today(@AuthenticationPrincipal AuthenticatedUser authenticatedUser) {
        return habitApplicationService.getTodayHabits(authenticatedUser);
    }

    @Operation(summary = "Create a check-in for current user's habit")
    @PostMapping("/{habitId}/checkins")
    public HabitCheckinResponse createCheckin(
            @AuthenticationPrincipal AuthenticatedUser authenticatedUser,
            @PathVariable Long habitId,
            @Valid @RequestBody HabitCheckinRequest request
    ) {
        return habitApplicationService.createCheckin(authenticatedUser, habitId, request);
    }

    @Operation(summary = "Delete current user's habit")
    @DeleteMapping("/{habitId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(
            @AuthenticationPrincipal AuthenticatedUser authenticatedUser,
            @PathVariable Long habitId
    ) {
        habitApplicationService.deleteHabit(authenticatedUser, habitId);
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