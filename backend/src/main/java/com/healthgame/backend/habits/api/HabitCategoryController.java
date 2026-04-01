package com.healthgame.backend.habits.api;

import com.healthgame.backend.habits.application.HabitCategoryApplicationService;
import com.healthgame.backend.habits.application.HabitCategoryCreateRequest;
import com.healthgame.backend.habits.application.HabitCategoryResponse;
import com.healthgame.backend.identity.infrastructure.security.AuthenticatedUser;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/habits/categories")
@SecurityRequirement(name = "bearerAuth")
public class HabitCategoryController {

    private final HabitCategoryApplicationService habitCategoryApplicationService;

    public HabitCategoryController(HabitCategoryApplicationService habitCategoryApplicationService) {
        this.habitCategoryApplicationService = habitCategoryApplicationService;
    }

    @Operation(summary = "List habit categories")
    @GetMapping
    public List<HabitCategoryResponse> list(@AuthenticationPrincipal AuthenticatedUser authenticatedUser) {
        // Категории глобальные, но эндпоинт под защитой — используем текущего пользователя.
        return habitCategoryApplicationService.listCategories();
    }

    @Operation(summary = "Create habit category")
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public HabitCategoryResponse create(
            @AuthenticationPrincipal AuthenticatedUser authenticatedUser,
            @Valid @RequestBody HabitCategoryCreateRequest request
    ) {
        return habitCategoryApplicationService.createCategory(request);
    }
}

