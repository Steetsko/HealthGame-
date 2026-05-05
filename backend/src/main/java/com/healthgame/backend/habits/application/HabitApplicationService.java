package com.healthgame.backend.habits.application;

import com.healthgame.backend.achievements.application.AchievementApplicationService;
import com.healthgame.backend.achievements.application.events.HabitCheckinCreatedEvent;
import com.healthgame.backend.shared.audit.AuditAction;
import com.healthgame.backend.shared.audit.AuditTrailService;
import com.healthgame.backend.challenges.application.ChallengeApplicationService;
import com.healthgame.backend.habits.infrastructure.persistence.HabitCategoryEntity;
import com.healthgame.backend.habits.infrastructure.persistence.HabitCategoryRepository;
import com.healthgame.backend.habits.infrastructure.persistence.HabitCheckinEntity;
import com.healthgame.backend.habits.infrastructure.persistence.HabitCheckinRepository;
import com.healthgame.backend.habits.infrastructure.persistence.HabitEntity;
import com.healthgame.backend.habits.infrastructure.persistence.HabitRepository;
import com.healthgame.backend.habits.infrastructure.persistence.HabitScheduleEntity;
import com.healthgame.backend.habits.infrastructure.persistence.HabitScheduleRepository;
import com.healthgame.backend.identity.infrastructure.persistence.UserEntity;
import com.healthgame.backend.identity.infrastructure.persistence.UserRepository;
import com.healthgame.backend.identity.infrastructure.security.AuthenticatedUser;
import com.healthgame.backend.notifications.application.NotificationApplicationService;
import com.healthgame.backend.shared.domain.ConflictException;
import com.healthgame.backend.shared.domain.ResourceNotFoundException;
import jakarta.transaction.Transactional;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;

@Service
public class HabitApplicationService {

    private static final Logger log = LoggerFactory.getLogger(HabitApplicationService.class);

    private final HabitRepository habitRepository;
    private final HabitCategoryRepository habitCategoryRepository;
    private final HabitScheduleRepository habitScheduleRepository;
    private final HabitCheckinRepository habitCheckinRepository;
    private final UserRepository userRepository;
    private final ChallengeApplicationService challengeApplicationService;
    private final AchievementApplicationService achievementApplicationService;
    private final NotificationApplicationService notificationApplicationService;
    private final ApplicationEventPublisher eventPublisher;
    private final AuditTrailService auditTrailService;

    public HabitApplicationService(
            HabitRepository habitRepository,
            HabitCategoryRepository habitCategoryRepository,
            HabitScheduleRepository habitScheduleRepository,
            HabitCheckinRepository habitCheckinRepository,
            UserRepository userRepository,
            ChallengeApplicationService challengeApplicationService,
            AchievementApplicationService achievementApplicationService,
            NotificationApplicationService notificationApplicationService,
            ApplicationEventPublisher eventPublisher,
            AuditTrailService auditTrailService
    ) {
        this.habitRepository = habitRepository;
        this.habitCategoryRepository = habitCategoryRepository;
        this.habitScheduleRepository = habitScheduleRepository;
        this.habitCheckinRepository = habitCheckinRepository;
        this.userRepository = userRepository;
        this.challengeApplicationService = challengeApplicationService;
        this.achievementApplicationService = achievementApplicationService;
        this.notificationApplicationService = notificationApplicationService;
        this.eventPublisher = eventPublisher;
        this.auditTrailService = auditTrailService;
    }

    public Page<HabitResponse> listHabits(AuthenticatedUser authenticatedUser, Pageable pageable) {
        Page<HabitEntity> page = habitRepository.findByUserId(authenticatedUser.userId(), pageable);
        List<Long> habitIds = page.getContent().stream().map(HabitEntity::getId).toList();
        Map<Long, List<HabitScheduleEntity>> schedules = habitIds.isEmpty()
                ? Map.of()
                : habitScheduleRepository.findByHabitIdIn(habitIds).stream().collect(Collectors.groupingBy(HabitScheduleEntity::getHabitId));
        Map<Integer, HabitCategoryEntity> categories = habitCategoryRepository.findAllById(
                page.getContent().stream().map(HabitEntity::getCategoryId).collect(Collectors.toSet())
        ).stream().collect(Collectors.toMap(HabitCategoryEntity::getId, Function.identity()));

        return page.map(habit -> toHabitResponse(habit, categories.get(habit.getCategoryId()), schedules.getOrDefault(habit.getId(), List.of())));
    }

    @Transactional
    public HabitResponse createHabit(AuthenticatedUser authenticatedUser, HabitCreateRequest request) {
        HabitCategoryEntity category = loadCategory(request.categoryId());
        validateFrequency(request.frequency());
        validateDates(request.startDate(), request.endDate());

        HabitEntity habit = new HabitEntity();
        habit.setUserId(authenticatedUser.userId());
        applyHabitFields(habit, request.categoryId(), request.name(), request.description(), request.startDate(), request.endDate(), request.targetValue(), request.unit(), request.frequency(), request.isActive() == null || request.isActive());

        HabitEntity saved = habitRepository.save(habit);
        List<HabitScheduleEntity> schedules = replaceSchedules(saved.getId(), request.schedules());
        log.info("Habit created: habitId={}, userId={}", saved.getId(), authenticatedUser.userId());
        return toHabitResponse(saved, category, schedules);
    }

    @Transactional
    public HabitResponse updateHabit(AuthenticatedUser authenticatedUser, Long habitId, HabitUpdateRequest request) {
        HabitEntity habit = getOwnedHabit(authenticatedUser, habitId);
        HabitCategoryEntity category = loadCategory(request.categoryId());
        validateFrequency(request.frequency());
        validateDates(request.startDate(), request.endDate());

        applyHabitFields(habit, request.categoryId(), request.name(), request.description(), request.startDate(), request.endDate(), request.targetValue(), request.unit(), request.frequency(), Boolean.TRUE.equals(request.isActive()));
        List<HabitScheduleEntity> schedules = replaceSchedules(habitId, request.schedules());
        return toHabitResponse(habit, category, schedules);
    }

    public HabitResponse getHabit(AuthenticatedUser authenticatedUser, Long habitId) {
        HabitEntity habit = getOwnedHabit(authenticatedUser, habitId);
        HabitCategoryEntity category = loadCategory(habit.getCategoryId());
        List<HabitScheduleEntity> schedules = habitScheduleRepository.findByHabitId(habitId);
        return toHabitResponse(habit, category, schedules);
    }

    public List<HabitTimelineDayResponse> getHabitTimeline(AuthenticatedUser authenticatedUser, Long habitId, int days) {
        HabitEntity habit = getOwnedHabit(authenticatedUser, habitId);
        UserEntity user = userRepository.findById(authenticatedUser.userId())
                .orElseThrow(() -> new ResourceNotFoundException("Authenticated user was not found"));
        int normalizedDays = Math.max(1, Math.min(days, 14));
        LocalDate startDate = LocalDate.now(ZoneId.of(user.getTimezone()));
        LocalDate endDate = startDate.plusDays(normalizedDays - 1L);

        List<HabitScheduleEntity> schedules = habitScheduleRepository.findByHabitId(habitId);
        Map<LocalDate, HabitCheckinEntity> checkinsByDate = habitCheckinRepository
                .findByHabitIdAndCheckinDateBetweenOrderByCheckinDateAsc(habitId, startDate, endDate)
                .stream()
                .collect(Collectors.toMap(HabitCheckinEntity::getCheckinDate, Function.identity(), (left, right) -> right, HashMap::new));

        List<HabitTimelineDayResponse> timeline = new ArrayList<>();
        for (LocalDate date = startDate; !date.isAfter(endDate); date = date.plusDays(1)) {
            boolean scheduled = isHabitScheduledOn(habit, schedules, date);
            HabitCheckinEntity checkin = checkinsByDate.get(date);
            timeline.add(new HabitTimelineDayResponse(date, scheduled, checkin != null, checkin != null ? checkin.getValue() : null));
        }
        return timeline;
    }

    @Transactional
    public void deleteHabit(AuthenticatedUser authenticatedUser, Long habitId) {
        HabitEntity habit = habitRepository.findByIdAndUserId(habitId, authenticatedUser.userId())
                .orElseThrow(() -> new ResourceNotFoundException("Habit was not found"));
        habitRepository.delete(habit);
        log.info("Habit deleted: habitId={}, userId={}", habitId, authenticatedUser.userId());
    }

    public List<TodayHabitResponse> getTodayHabits(AuthenticatedUser authenticatedUser) {
        UserEntity user = userRepository.findById(authenticatedUser.userId())
                .orElseThrow(() -> new ResourceNotFoundException("Authenticated user was not found"));
        LocalDate today = LocalDate.now(ZoneId.of(user.getTimezone()));
        int dayOfWeek = today.getDayOfWeek().getValue();

        List<HabitEntity> habits = habitRepository.findByUserIdAndActiveTrue(authenticatedUser.userId()).stream()
                .filter(habit -> !habit.getStartDate().isAfter(today))
                .filter(habit -> habit.getEndDate() == null || !habit.getEndDate().isBefore(today))
                .toList();

        Map<Integer, HabitCategoryEntity> categories = habitCategoryRepository.findAllById(
                habits.stream().map(HabitEntity::getCategoryId).collect(Collectors.toSet())
        ).stream().collect(Collectors.toMap(HabitCategoryEntity::getId, Function.identity()));

        Map<Long, List<HabitScheduleEntity>> schedules = habits.isEmpty()
                ? Map.of()
                : habitScheduleRepository.findByHabitIdIn(habits.stream().map(HabitEntity::getId).toList())
                .stream()
                .collect(Collectors.groupingBy(HabitScheduleEntity::getHabitId));

        Map<Long, HabitCheckinEntity> completedToday = habits.isEmpty()
                ? Map.of()
                : habitCheckinRepository.findByHabitIdInAndCheckinDate(habits.stream().map(HabitEntity::getId).toList(), today)
                .stream()
                .collect(Collectors.toMap(HabitCheckinEntity::getHabitId, Function.identity()));

        return habits.stream()
                .flatMap(habit -> buildTodayResponses(
                        habit,
                        categories.get(habit.getCategoryId()),
                        schedules.getOrDefault(habit.getId(), List.of()),
                        today,
                        dayOfWeek,
                        completedToday.containsKey(habit.getId())
                ).stream())
                .sorted(Comparator.comparing(TodayHabitResponse::plannedTime, Comparator.nullsLast(Comparator.naturalOrder())))
                .toList();
    }

    @AuditAction(value = "Создание отметки выполнения привычки", domain = "HABITS")
    @Transactional
    public HabitCheckinResponse createCheckin(AuthenticatedUser authenticatedUser, Long habitId, HabitCheckinRequest request) {
        return auditTrailService.execute(this, "createCheckin", () -> doCreateCheckin(authenticatedUser, habitId, request));
    }

    private HabitCheckinResponse doCreateCheckin(AuthenticatedUser authenticatedUser, Long habitId, HabitCheckinRequest request) {
        HabitEntity habit = getOwnedHabit(authenticatedUser, habitId);
        if (habitCheckinRepository.existsByHabitIdAndCheckinDate(habitId, request.checkinDate())) {
            throw new ConflictException("Check-in for this habit and date already exists");
        }
        if (!habit.isActive()) {
            throw new ConflictException("Cannot create check-in for inactive habit");
        }
        if (request.checkinDate().isBefore(habit.getStartDate()) || (habit.getEndDate() != null && request.checkinDate().isAfter(habit.getEndDate()))) {
            throw new ConflictException("Check-in date is outside the habit active period");
        }
        String source = request.source().trim().toLowerCase();
        if (!List.of("manual", "integration").contains(source)) {
            throw new ConflictException("Check-in source must be manual or integration");
        }

        HabitCheckinEntity checkin = new HabitCheckinEntity();
        checkin.setHabitId(habitId);
        checkin.setCheckinDate(request.checkinDate());
        checkin.setValue(request.value());
        checkin.setComment(request.comment());
        checkin.setSource(source);
        checkin.setCreatedAt(Instant.now());

        HabitCheckinEntity saved = habitCheckinRepository.save(checkin);
        habitCheckinRepository.flush();
        challengeApplicationService.handleHabitCheckinCreated(authenticatedUser.userId(), habit, saved);
        eventPublisher.publishEvent(new HabitCheckinCreatedEvent(authenticatedUser.userId()));
        achievementApplicationService.refreshHabitMilestones(authenticatedUser.userId());
        notificationApplicationService.notifyXpGained(authenticatedUser.userId(), 10, "/dashboard");
        log.info("Habit check-in created: habitId={}, userId={}, checkinId={}", habitId, authenticatedUser.userId(), saved.getId());
        return new HabitCheckinResponse(saved.getId(), saved.getHabitId(), saved.getCheckinDate(), saved.getValue(), saved.getComment(), saved.getSource(), saved.getCreatedAt());
    }

    private HabitCategoryEntity loadCategory(Integer categoryId) {
        return habitCategoryRepository.findById(categoryId)
                .orElseThrow(() -> new ResourceNotFoundException("Habit category was not found"));
    }

    private HabitEntity getOwnedHabit(AuthenticatedUser authenticatedUser, Long habitId) {
        return habitRepository.findByIdAndUserId(habitId, authenticatedUser.userId())
                .orElseThrow(() -> new ResourceNotFoundException("Habit was not found"));
    }

    private void applyHabitFields(HabitEntity habit, Integer categoryId, String name, String description, LocalDate startDate, LocalDate endDate, Integer targetValue, String unit, String frequency, boolean active) {
        habit.setCategoryId(categoryId);
        habit.setName(name.trim());
        habit.setDescription(description);
        habit.setStartDate(startDate);
        habit.setEndDate(endDate);
        habit.setTargetValue(targetValue);
        habit.setUnit(unit.trim());
        habit.setFrequency(frequency.trim().toUpperCase());
        habit.setActive(active);
    }

    private List<HabitScheduleEntity> replaceSchedules(Long habitId, List<HabitScheduleRequest> requests) {
        habitScheduleRepository.deleteByHabitId(habitId);
        if (requests == null || requests.isEmpty()) {
            return List.of();
        }

        List<HabitScheduleEntity> schedules = new ArrayList<>();
        for (HabitScheduleRequest request : requests) {
            HabitScheduleEntity schedule = new HabitScheduleEntity();
            schedule.setHabitId(habitId);
            schedule.setDayOfWeek(request.dayOfWeek() == null ? null : request.dayOfWeek().shortValue());
            schedule.setTimeOfDay(request.timeOfDay());
            schedule.setMinTimesPerDay(request.minTimesPerDay() == null ? null : request.minTimesPerDay().shortValue());
            schedule.setEnabled(request.isEnabled() == null || request.isEnabled());
            schedules.add(schedule);
        }
        return habitScheduleRepository.saveAll(schedules);
    }

    private void validateFrequency(String frequency) {
        String normalized = frequency == null ? "" : frequency.trim().toUpperCase();
        if (!List.of("DAILY", "WEEKLY", "CUSTOM").contains(normalized)) {
            throw new ConflictException("Habit frequency must be DAILY, WEEKLY or CUSTOM");
        }
    }

    private void validateDates(LocalDate startDate, LocalDate endDate) {
        if (endDate != null && endDate.isBefore(startDate)) {
            throw new ConflictException("Habit end date cannot be before start date");
        }
    }

    private boolean isHabitScheduledOn(HabitEntity habit, List<HabitScheduleEntity> schedules, LocalDate date) {
        if (date.isBefore(habit.getStartDate()) || (habit.getEndDate() != null && date.isAfter(habit.getEndDate()))) {
            return false;
        }
        if (schedules.isEmpty()) {
            return true;
        }
        int dayOfWeek = date.getDayOfWeek().getValue();
        if ("DAILY".equals(habit.getFrequency())) {
            return schedules.stream()
                    .filter(HabitScheduleEntity::isEnabled)
                    .anyMatch(schedule -> schedule.getDayOfWeek() == null || schedule.getDayOfWeek().intValue() == dayOfWeek);
        }
        return schedules.stream()
                .filter(HabitScheduleEntity::isEnabled)
                .anyMatch(schedule -> schedule.getDayOfWeek() != null && schedule.getDayOfWeek().intValue() == dayOfWeek);
    }

    private HabitResponse toHabitResponse(HabitEntity habit, HabitCategoryEntity category, List<HabitScheduleEntity> schedules) {
        List<HabitScheduleResponse> scheduleResponses = schedules.stream()
                .map(schedule -> new HabitScheduleResponse(
                        schedule.getId(),
                        schedule.getDayOfWeek() == null ? null : schedule.getDayOfWeek().intValue(),
                        schedule.getTimeOfDay(),
                        schedule.getMinTimesPerDay() == null ? null : schedule.getMinTimesPerDay().intValue(),
                        schedule.isEnabled()
                ))
                .toList();
        return new HabitResponse(
                habit.getId(),
                habit.getCategoryId(),
                category != null ? category.getName() : null,
                habit.getName(),
                habit.getDescription(),
                habit.getStartDate(),
                habit.getEndDate(),
                habit.getTargetValue(),
                habit.getUnit(),
                habit.getFrequency(),
                habit.isActive(),
                scheduleResponses
        );
    }

    private List<TodayHabitResponse> buildTodayResponses(
            HabitEntity habit,
            HabitCategoryEntity category,
            List<HabitScheduleEntity> schedules,
            LocalDate today,
            int dayOfWeek,
            boolean completedToday
    ) {
        if ("DAILY".equals(habit.getFrequency())) {
            if (schedules.isEmpty()) {
                return List.of(new TodayHabitResponse(habit.getId(), habit.getName(), category != null ? category.getName() : null, habit.getTargetValue(), habit.getUnit(), habit.getFrequency(), today, null, null, completedToday));
            }
            return schedules.stream()
                    .filter(HabitScheduleEntity::isEnabled)
                    .filter(schedule -> schedule.getDayOfWeek() == null || schedule.getDayOfWeek().intValue() == dayOfWeek)
                    .map(schedule -> new TodayHabitResponse(
                            habit.getId(),
                            habit.getName(),
                            category != null ? category.getName() : null,
                            habit.getTargetValue(),
                            habit.getUnit(),
                            habit.getFrequency(),
                            today,
                            schedule.getTimeOfDay(),
                            schedule.getMinTimesPerDay() == null ? null : schedule.getMinTimesPerDay().intValue(),
                            completedToday
                    ))
                    .toList();
        }
        return schedules.stream()
                .filter(HabitScheduleEntity::isEnabled)
                .filter(schedule -> schedule.getDayOfWeek() != null && schedule.getDayOfWeek().intValue() == dayOfWeek)
                .map(schedule -> new TodayHabitResponse(
                        habit.getId(),
                        habit.getName(),
                        category != null ? category.getName() : null,
                        habit.getTargetValue(),
                        habit.getUnit(),
                        habit.getFrequency(),
                        today,
                        schedule.getTimeOfDay(),
                        schedule.getMinTimesPerDay() == null ? null : schedule.getMinTimesPerDay().intValue(),
                        completedToday
                ))
                .toList();
    }
}



