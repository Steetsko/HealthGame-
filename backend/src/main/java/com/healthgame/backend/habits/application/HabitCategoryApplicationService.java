package com.healthgame.backend.habits.application;

import com.healthgame.backend.habits.infrastructure.persistence.HabitCategoryEntity;
import com.healthgame.backend.habits.infrastructure.persistence.HabitCategoryRepository;
import com.healthgame.backend.shared.domain.ConflictException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class HabitCategoryApplicationService {

    private final HabitCategoryRepository habitCategoryRepository;

    public HabitCategoryApplicationService(HabitCategoryRepository habitCategoryRepository) {
        this.habitCategoryRepository = habitCategoryRepository;
    }

    public java.util.List<HabitCategoryResponse> listCategories() {
        return habitCategoryRepository.findAll().stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public HabitCategoryResponse createCategory(HabitCategoryCreateRequest request) {
        if (habitCategoryRepository.existsByNameIgnoreCase(request.name())) {
            throw new ConflictException("Habit category already exists");
        }

        HabitCategoryEntity entity = new HabitCategoryEntity();
        entity.setName(request.name().trim());
        entity.setDescription(null);
        entity.setIcon(null);
        HabitCategoryEntity saved = habitCategoryRepository.save(entity);

        return toResponse(saved);
    }

    private HabitCategoryResponse toResponse(HabitCategoryEntity entity) {
        return new HabitCategoryResponse(entity.getId(), entity.getName(), entity.getDescription(), entity.getIcon());
    }
}

