package com.healthgame.backend.integrations.application;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.healthgame.backend.habits.infrastructure.persistence.HabitEntity;
import com.healthgame.backend.habits.infrastructure.persistence.HabitRepository;
import com.healthgame.backend.habits.infrastructure.persistence.HabitScheduleEntity;
import com.healthgame.backend.habits.infrastructure.persistence.HabitScheduleRepository;
import com.healthgame.backend.identity.application.AuthApplicationService;
import com.healthgame.backend.identity.application.AuthResponse;
import com.healthgame.backend.identity.infrastructure.persistence.UserEntity;
import com.healthgame.backend.identity.infrastructure.persistence.UserRepository;
import com.healthgame.backend.identity.infrastructure.persistence.UserRoleJdbcRepository;
import com.healthgame.backend.identity.infrastructure.security.AuthenticatedUser;
import com.healthgame.backend.identity.infrastructure.security.JwtTokenService;
import com.healthgame.backend.integrations.infrastructure.persistence.ExternalIntegrationEntity;
import com.healthgame.backend.integrations.infrastructure.persistence.ExternalIntegrationRepository;
import com.healthgame.backend.integrations.infrastructure.persistence.IntegrationTokenEntity;
import com.healthgame.backend.integrations.infrastructure.persistence.IntegrationTokenRepository;
import com.healthgame.backend.shared.domain.ConflictException;
import com.healthgame.backend.shared.domain.ResourceNotFoundException;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.client.OAuth2AuthorizedClient;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;

@Service
public class GoogleIntegrationApplicationService {

    private static final Logger log = LoggerFactory.getLogger(GoogleIntegrationApplicationService.class);
    private static final String GOOGLE_PROVIDER = "google";
    private static final String HEALTHGAME_EVENT_PREFIX = "HealthGame: ";
    private static final String HEALTHGAME_MANAGED_KEY = "healthgameManaged";
    private static final String HEALTHGAME_EVENT_KEY = "healthgameEventKey";
    private static final String HEALTHGAME_EVENT_KEY_VALUE = "true";
    private static final LocalTime DEFAULT_HABIT_TIME = LocalTime.of(9, 0);
    private static final Duration DEFAULT_HABIT_DURATION = Duration.ofMinutes(15);
    private static final Duration AGENDA_WINDOW = Duration.ofDays(14);
    private static final Duration SYNC_WINDOW = Duration.ofDays(7);
    private static final int AGENDA_LIMIT = 20;
    private static final DateTimeFormatter GOOGLE_DATE_TIME_FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ssXXX");

    private final UserRepository userRepository;
    private final UserRoleJdbcRepository userRoleJdbcRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthApplicationService authApplicationService;
    private final JwtTokenService jwtTokenService;
    private final ExternalIntegrationRepository externalIntegrationRepository;
    private final IntegrationTokenRepository integrationTokenRepository;
    private final HabitRepository habitRepository;
    private final HabitScheduleRepository habitScheduleRepository;
    private final RestClient googleRestClient;
    private final RestClient googleOauthRestClient;
    private final ObjectMapper objectMapper;
    private final HttpClient googleHttpClient;
    private final String googleClientId;
    private final String googleClientSecret;

    public GoogleIntegrationApplicationService(
            UserRepository userRepository,
            UserRoleJdbcRepository userRoleJdbcRepository,
            PasswordEncoder passwordEncoder,
            AuthApplicationService authApplicationService,
            JwtTokenService jwtTokenService,
            ExternalIntegrationRepository externalIntegrationRepository,
            IntegrationTokenRepository integrationTokenRepository,
            HabitRepository habitRepository,
            HabitScheduleRepository habitScheduleRepository,
            RestClient.Builder restClientBuilder,
            ObjectMapper objectMapper,
            @Value("${spring.security.oauth2.client.registration.google.client-id}") String googleClientId,
            @Value("${spring.security.oauth2.client.registration.google.client-secret}") String googleClientSecret
    ) {
        this.userRepository = userRepository;
        this.userRoleJdbcRepository = userRoleJdbcRepository;
        this.passwordEncoder = passwordEncoder;
        this.authApplicationService = authApplicationService;
        this.jwtTokenService = jwtTokenService;
        this.externalIntegrationRepository = externalIntegrationRepository;
        this.integrationTokenRepository = integrationTokenRepository;
        this.habitRepository = habitRepository;
        this.habitScheduleRepository = habitScheduleRepository;
        this.googleRestClient = restClientBuilder.baseUrl("https://www.googleapis.com").build();
        this.googleOauthRestClient = restClientBuilder.baseUrl("https://oauth2.googleapis.com").build();
        this.objectMapper = objectMapper;
        this.googleHttpClient = HttpClient.newHttpClient();
        this.googleClientId = googleClientId;
        this.googleClientSecret = googleClientSecret;
    }

    @Transactional
    public AuthResponse handleGoogleLogin(OAuth2User principal, OAuth2AuthorizedClient authorizedClient) {
        String subject = attribute(principal, "sub").orElseThrow(() -> new ConflictException("Google account id is missing"));
        String email = attribute(principal, "email")
                .map(value -> value.trim().toLowerCase(Locale.ROOT))
                .orElseThrow(() -> new ConflictException("Google email is missing"));
        Optional<String> firstName = attribute(principal, "given_name").or(() -> attribute(principal, "name"));
        String avatarUrl = attribute(principal, "picture").orElse(null);

        UserEntity user = externalIntegrationRepository.findByProviderAndExternalUser(GOOGLE_PROVIDER, subject)
                .flatMap(integration -> userRepository.findById(integration.getUserId()))
                .or(() -> userRepository.findByEmailIgnoreCase(email))
                .orElseGet(() -> createGoogleUser(email, firstName.orElse(null), avatarUrl));

        boolean newUser = user.getId() == null;
        user.setEmail(email);
        if (firstName.isPresent() && (user.getFirstName() == null || user.getFirstName().isBlank())) {
            user.setFirstName(firstName.get());
        }
        if (avatarUrl != null && !avatarUrl.isBlank()) {
            user.setAvatarUrl(avatarUrl);
        }
        user.setStatus("active");
        user.setLastLoginAt(Instant.now());

        UserEntity savedUser = userRepository.save(user);
        if (newUser) {
            userRoleJdbcRepository.assignDefaultUserRole(savedUser.getId());
        }

        ExternalIntegrationEntity integration = externalIntegrationRepository.findByUserIdAndProvider(savedUser.getId(), GOOGLE_PROVIDER)
                .orElseGet(ExternalIntegrationEntity::new);
        integration.setUserId(savedUser.getId());
        integration.setProvider(GOOGLE_PROVIDER);
        integration.setExternalUser(subject);
        integration.setStatus("CONNECTED");
        if (integration.getCreatedAt() == null) {
            integration.setCreatedAt(Instant.now());
        }

        ExternalIntegrationEntity savedIntegration = externalIntegrationRepository.save(integration);
        saveIntegrationTokens(savedIntegration.getId(), authorizedClient);

        log.info(
                "Google integration connected: userId={}, provider={}, authorities={}",
                savedUser.getId(),
                GOOGLE_PROVIDER,
                principal.getAuthorities().stream().map(GrantedAuthority::getAuthority).toList()
        );

        return authApplicationService.issueExternalLoginTokens(savedUser, "google-oauth", GOOGLE_PROVIDER);
    }

    public GoogleIntegrationConnectLinkResponse createGoogleCalendarConnectLink(AuthenticatedUser authenticatedUser, String redirectPath) {
        String normalizedRedirectPath = normalizeRedirectPath(redirectPath);
        String connectToken = jwtTokenService.createGoogleConnectToken(authenticatedUser.userId(), normalizedRedirectPath);
        return new GoogleIntegrationConnectLinkResponse("/oauth2/authorization/google?connect_token=" + URLEncoder.encode(connectToken, StandardCharsets.UTF_8));
    }

    @Transactional
    public void connectGoogleCalendar(Long userId, OAuth2User principal, OAuth2AuthorizedClient authorizedClient) {
        UserEntity user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User was not found"));

        String subject = attribute(principal, "sub").orElseThrow(() -> new ConflictException("Google account id is missing"));
        String email = attribute(principal, "email")
                .map(value -> value.trim().toLowerCase(Locale.ROOT))
                .orElseThrow(() -> new ConflictException("Google email is missing"));
        String avatarUrl = attribute(principal, "picture").orElse(null);

        externalIntegrationRepository.findByProviderAndExternalUser(GOOGLE_PROVIDER, subject)
                .filter(existing -> !existing.getUserId().equals(userId))
                .ifPresent(existing -> {
                    throw new ConflictException("Этот Google-аккаунт уже подключен к другому профилю HealthGame.");
                });

        user.setEmail(user.getEmail() == null || user.getEmail().isBlank() ? email : user.getEmail());
        if ((user.getAvatarUrl() == null || user.getAvatarUrl().isBlank()) && avatarUrl != null && !avatarUrl.isBlank()) {
            user.setAvatarUrl(avatarUrl);
        }
        userRepository.save(user);

        ExternalIntegrationEntity integration = externalIntegrationRepository.findByUserIdAndProvider(userId, GOOGLE_PROVIDER)
                .orElseGet(ExternalIntegrationEntity::new);
        integration.setUserId(userId);
        integration.setProvider(GOOGLE_PROVIDER);
        integration.setExternalUser(subject);
        integration.setStatus("CONNECTED");
        if (integration.getCreatedAt() == null) {
            integration.setCreatedAt(Instant.now());
        }

        ExternalIntegrationEntity savedIntegration = externalIntegrationRepository.save(integration);
        saveIntegrationTokens(savedIntegration.getId(), authorizedClient);
        log.info("Google Calendar linked to existing user: userId={}, googleSubject={}", userId, subject);
    }

    @Transactional
    public GoogleCalendarAgendaResponse getGoogleAgenda(AuthenticatedUser authenticatedUser) {
        Optional<ExternalIntegrationEntity> integrationOptional = externalIntegrationRepository.findByUserIdAndProvider(
                authenticatedUser.userId(),
                GOOGLE_PROVIDER
        );
        if (integrationOptional.isEmpty() || !"CONNECTED".equalsIgnoreCase(integrationOptional.get().getStatus())) {
            return new GoogleCalendarAgendaResponse(false, GOOGLE_PROVIDER, List.of(), "Google Calendar не подключен.");
        }

        Optional<IntegrationTokenEntity> tokenOptional = integrationTokenRepository.findByIntegrationId(integrationOptional.get().getId());
        if (tokenOptional.isEmpty() || tokenOptional.get().getAccessToken() == null || tokenOptional.get().getAccessToken().isBlank()) {
            return new GoogleCalendarAgendaResponse(false, GOOGLE_PROVIDER, List.of(), "Google Calendar не подключен.");
        }

        Instant now = Instant.now();
        Instant horizon = now.plus(AGENDA_WINDOW);

        try {
            String accessToken = ensureValidGoogleAccessToken(integrationOptional.get(), tokenOptional.get());
            String agendaUri = buildGoogleEventsUri(
                    GOOGLE_DATE_TIME_FORMATTER.format(now.atZone(ZoneId.of("UTC")).toOffsetDateTime()),
                    GOOGLE_DATE_TIME_FORMATTER.format(horizon.atZone(ZoneId.of("UTC")).toOffsetDateTime()),
                    AGENDA_LIMIT
            );
            JsonNode root = googleApiGetJson(accessToken, agendaUri);

            List<GoogleCalendarEventResponse> events = new ArrayList<>();
            if (root != null && root.has("items")) {
                for (JsonNode item : root.get("items")) {
                    if (!isUsefulAgendaEvent(item, horizon)) {
                        continue;
                    }

                    String startAt = item.path("start").path("dateTime").asText("");
                    events.add(new GoogleCalendarEventResponse(
                            item.path("summary").asText("Событие без названия"),
                            startAt,
                            false,
                            item.path("htmlLink").asText(null)
                    ));
                }
            }

            String message = events.isEmpty()
                    ? "На ближайшие дни событий нет."
                    : "Ближайшие события из Google Calendar.";
            return new GoogleCalendarAgendaResponse(true, GOOGLE_PROVIDER, events, message);
        } catch (RestClientResponseException exception) {
            log.warn(
                    "Failed to read Google Calendar agenda: userId={}, status={}, body={}",
                    authenticatedUser.userId(),
                    exception.getStatusCode(),
                    exception.getResponseBodyAsString()
            );
            if (exception.getStatusCode().value() == 401 || exception.getStatusCode().value() == 403) {
                return new GoogleCalendarAgendaResponse(false, GOOGLE_PROVIDER, List.of(), resolveGoogleAccessErrorMessage(exception));
            }
            return new GoogleCalendarAgendaResponse(false, GOOGLE_PROVIDER, List.of(), "Не удалось загрузить ближайшие события Google Calendar.");
        }
    }

    @Transactional
    public GoogleCalendarSyncResponse syncHabitsToCalendar(AuthenticatedUser authenticatedUser) {
        UserEntity user = userRepository.findById(authenticatedUser.userId())
                .orElseThrow(() -> new ResourceNotFoundException("User was not found"));

        String accessToken = requireGoogleAccessToken(authenticatedUser);
        ZoneId zoneId = ZoneId.of(Optional.ofNullable(user.getTimezone()).filter(value -> !value.isBlank()).orElse("Europe/Minsk"));
        LocalDate from = LocalDate.now(zoneId);
        LocalDate to = from.plusDays(SYNC_WINDOW.toDays() - 1);

        try {
            List<HabitCalendarEventDraft> drafts = buildHabitDrafts(user.getId(), from, to);
            if (drafts.isEmpty()) {
                return new GoogleCalendarSyncResponse(true, 0, 0, "На ближайшие 7 дней нет привычек для переноса");
            }

            ExistingEventKeys existingEventKeys = fetchExistingHealthGameEventKeys(accessToken, zoneId, from, to);

            int createdCount = 0;
            int skippedCount = 0;
            for (HabitCalendarEventDraft draft : drafts) {
                if (existingEventKeys.contains(draft.integrationKey(), draft.fallbackKey())) {
                    skippedCount++;
                    continue;
                }
                try {
                    createCalendarEvent(accessToken, zoneId, draft);
                } catch (RestClientResponseException exception) {
                    log.warn(
                            "Failed to create Google Calendar event: userId={}, title={}, startAt={}, status={}, body={}",
                            authenticatedUser.userId(),
                            draft.title(),
                            draft.startAt(),
                            exception.getStatusCode(),
                            exception.getResponseBodyAsString()
                    );
                    throw exception;
                }
                createdCount++;
            }

            String message = createdCount > 0
                    ? "Привычки перенесены в Google Calendar"
                    : "На ближайшие 7 дней все привычки уже есть в Google Calendar.";
            return new GoogleCalendarSyncResponse(true, createdCount, skippedCount, message);
        } catch (RestClientResponseException exception) {
            log.warn(
                    "Failed to sync habits to Google Calendar: userId={}, status={}, body={}",
                    authenticatedUser.userId(),
                    exception.getStatusCode(),
                    exception.getResponseBodyAsString()
            );
            if (exception.getStatusCode().value() == 401 || exception.getStatusCode().value() == 403) {
                throw new ConflictException(resolveGoogleAccessErrorMessage(exception));
            }
            throw new ConflictException("Не удалось создать события в Google Calendar. Проверьте подключение Google и повторите попытку.");
        }
    }

    @Transactional
    public GoogleIntegrationConnectionResponse disconnectGoogleCalendar(AuthenticatedUser authenticatedUser) {
        ExternalIntegrationEntity integration = externalIntegrationRepository.findByUserIdAndProvider(authenticatedUser.userId(), GOOGLE_PROVIDER)
                .orElseThrow(() -> new ConflictException("Google Calendar не подключен"));

        integration.setStatus("DISCONNECTED");
        externalIntegrationRepository.save(integration);
        integrationTokenRepository.deleteByIntegrationId(integration.getId());
        return new GoogleIntegrationConnectionResponse(false, "Google Calendar отключен.");
    }

    private ExistingEventKeys fetchExistingHealthGameEventKeys(String accessToken, ZoneId zoneId, LocalDate from, LocalDate to) {
        try {
            String existingEventsUri = buildGoogleEventsUri(
                    formatGoogleDateTime(from.atStartOfDay(), zoneId),
                    formatGoogleDateTime(to.plusDays(1).atStartOfDay(), zoneId),
                    100
            );
            JsonNode root = googleApiGetJson(accessToken, existingEventsUri);

            List<String> integrationKeys = new ArrayList<>();
            List<String> fallbackKeys = new ArrayList<>();
            if (root != null && root.has("items")) {
                for (JsonNode item : root.get("items")) {
                    if (!isManagedHealthGameEvent(item)) {
                        continue;
                    }

                    String eventKey = item.path("extendedProperties").path("private").path(HEALTHGAME_EVENT_KEY).asText("");
                    if (!eventKey.isBlank()) {
                        integrationKeys.add(eventKey);
                    }

                    String summary = item.path("summary").asText("");
                    String startAt = item.path("start").path("dateTime").asText("");
                    if (!summary.isBlank() && !startAt.isBlank()) {
                        try {
                            fallbackKeys.add(summary + "|" + OffsetDateTime.parse(startAt).toLocalDateTime());
                        } catch (Exception ignored) {
                            fallbackKeys.add(summary + "|" + startAt);
                        }
                    }
                }
            }

            return new ExistingEventKeys(integrationKeys, fallbackKeys);
        } catch (RestClientResponseException exception) {
            log.warn(
                    "Failed to fetch existing HealthGame events from Google Calendar, continuing without duplicate pre-check: status={}, body={}",
                    exception.getStatusCode(),
                    exception.getResponseBodyAsString()
            );
            return new ExistingEventKeys(List.of(), List.of());
        }
    }

    private List<HabitCalendarEventDraft> buildHabitDrafts(Long userId, LocalDate from, LocalDate to) {
        List<HabitEntity> habits = habitRepository.findByUserIdAndActiveTrue(userId);
        if (habits.isEmpty()) {
            return List.of();
        }

        List<Long> habitIds = habits.stream().map(HabitEntity::getId).toList();
        Map<Long, List<HabitScheduleEntity>> schedulesByHabit = habitScheduleRepository.findByHabitIdIn(habitIds).stream()
                .filter(HabitScheduleEntity::isEnabled)
                .collect(Collectors.groupingBy(HabitScheduleEntity::getHabitId));

        Map<String, HabitCalendarEventDraft> drafts = new LinkedHashMap<>();
        for (HabitEntity habit : habits) {
            List<HabitScheduleEntity> schedules = schedulesByHabit.getOrDefault(habit.getId(), List.of());
            for (LocalDate date = from; !date.isAfter(to); date = date.plusDays(1)) {
                if (habit.getStartDate() != null && date.isBefore(habit.getStartDate())) {
                    continue;
                }
                if (habit.getEndDate() != null && date.isAfter(habit.getEndDate())) {
                    continue;
                }

                if (schedules.isEmpty()) {
                    putDraft(drafts, habit, date, DEFAULT_HABIT_TIME);
                    continue;
                }

                LocalDate targetDate = date;
                schedules.stream()
                        .filter(schedule -> schedule.getDayOfWeek() == null || schedule.getDayOfWeek() == targetDate.getDayOfWeek().getValue())
                        .forEach(schedule -> putDraft(
                                drafts,
                                habit,
                                targetDate,
                                Optional.ofNullable(schedule.getTimeOfDay()).orElse(DEFAULT_HABIT_TIME)
                        ));
            }
        }

        return drafts.values().stream()
                .sorted(Comparator.comparing(HabitCalendarEventDraft::startAt))
                .toList();
    }

    private void putDraft(Map<String, HabitCalendarEventDraft> drafts, HabitEntity habit, LocalDate date, LocalTime time) {
        LocalDateTime startAt = LocalDateTime.of(date, time);
        String integrationKey = habit.getId() + "|" + startAt;
        String title = HEALTHGAME_EVENT_PREFIX + habit.getName();
        String fallbackKey = title + "|" + startAt;

        drafts.putIfAbsent(integrationKey, new HabitCalendarEventDraft(
                title,
                startAt,
                startAt.plus(DEFAULT_HABIT_DURATION),
                buildHabitDescription(habit),
                integrationKey,
                fallbackKey
        ));
    }

    private String buildHabitDescription(HabitEntity habit) {
        StringBuilder builder = new StringBuilder("Привычка из HealthGame. Отметьте выполнение в приложении.");
        if (habit.getDescription() != null && !habit.getDescription().isBlank()) {
            builder.append("\n").append(habit.getDescription().trim());
        }
        if (habit.getTargetValue() != null && habit.getUnit() != null && !habit.getUnit().isBlank()) {
            builder.append("\nЦель: ").append(habit.getTargetValue()).append(" ").append(habit.getUnit());
        }
        return builder.toString();
    }

    private void createCalendarEvent(String accessToken, ZoneId zoneId, HabitCalendarEventDraft draft) {
        Map<String, Object> richBody = Map.of(
                "summary", draft.title(),
                "description", draft.description(),
                "start", Map.of(
                        "dateTime", formatGoogleDateTime(draft.startAt(), zoneId),
                        "timeZone", zoneId.toString()
                ),
                "end", Map.of(
                        "dateTime", formatGoogleDateTime(draft.endAt(), zoneId),
                        "timeZone", zoneId.toString()
                )
        );

        try {
            googleApiPostJson(accessToken, "/calendar/v3/calendars/primary/events", writeJson(richBody));
        } catch (RestClientResponseException exception) {
            if (exception.getStatusCode().value() != 400) {
                throw exception;
            }

            log.warn(
                    "Google rejected rich event payload, retrying with minimal payload: title={}, startAt={}, body={}",
                    draft.title(),
                    draft.startAt(),
                    exception.getResponseBodyAsString()
            );

            Map<String, Object> minimalBody = Map.of(
                    "summary", draft.title(),
                    "start", Map.of("dateTime", formatGoogleDateTime(draft.startAt(), zoneId)),
                    "end", Map.of("dateTime", formatGoogleDateTime(draft.endAt(), zoneId))
            );

            googleApiPostJson(accessToken, "/calendar/v3/calendars/primary/events", writeJson(minimalBody));
        }
    }

    private String buildGoogleEventsUri(String timeMin, String timeMax, int maxResults) {
        return "/calendar/v3/calendars/primary/events"
                + "?singleEvents=true"
                + "&orderBy=startTime"
                + "&timeMin=" + encodeGoogleQueryValue(timeMin)
                + "&timeMax=" + encodeGoogleQueryValue(timeMax)
                + "&maxResults=" + maxResults;
    }

    private String encodeGoogleQueryValue(String value) {
        return URLEncoder.encode(value, StandardCharsets.UTF_8);
    }

    private String formatGoogleDateTime(LocalDateTime value, ZoneId zoneId) {
        return GOOGLE_DATE_TIME_FORMATTER.format(value.atZone(zoneId).toOffsetDateTime());
    }

    private String writeJson(Object payload) {
        try {
            return objectMapper.writeValueAsString(payload);
        } catch (JsonProcessingException exception) {
            throw new IllegalStateException("Не удалось подготовить JSON для Google Calendar", exception);
        }
    }

    private JsonNode googleApiGetJson(String accessToken, String uri) {
        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create("https://www.googleapis.com" + uri))
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + accessToken)
                .header(HttpHeaders.ACCEPT, MediaType.APPLICATION_JSON_VALUE)
                .GET()
                .build();
        String responseBody = sendGoogleRequest(request);
        try {
            return objectMapper.readTree(responseBody);
        } catch (JsonProcessingException exception) {
            throw new IllegalStateException("Не удалось разобрать ответ Google Calendar", exception);
        }
    }

    private void googleApiPostJson(String accessToken, String uri, String jsonBody) {
        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create("https://www.googleapis.com" + uri))
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + accessToken)
                .header(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE)
                .header(HttpHeaders.ACCEPT, MediaType.APPLICATION_JSON_VALUE)
                .POST(HttpRequest.BodyPublishers.ofString(jsonBody, StandardCharsets.UTF_8))
                .build();
        sendGoogleRequest(request);
    }

    private String sendGoogleRequest(HttpRequest request) {
        try {
            HttpResponse<String> response = googleHttpClient.send(request, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
            if (response.statusCode() >= 400) {
                throw new RestClientResponseException(
                        "Google Calendar request failed",
                        response.statusCode(),
                        "",
                        null,
                        response.body() != null ? response.body().getBytes(StandardCharsets.UTF_8) : new byte[0],
                        StandardCharsets.UTF_8
                );
            }
            return response.body();
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException("Запрос к Google Calendar был прерван", exception);
        } catch (RestClientResponseException exception) {
            throw exception;
        } catch (Exception exception) {
            throw new IllegalStateException("Не удалось выполнить запрос к Google Calendar", exception);
        }
    }

    private boolean isUsefulAgendaEvent(JsonNode item, Instant horizon) {
        String dateTime = item.path("start").path("dateTime").asText("");
        if (dateTime.isBlank()) {
            return false;
        }

        Instant startInstant;
        try {
            startInstant = OffsetDateTime.parse(dateTime).toInstant();
        } catch (Exception exception) {
            return false;
        }

        if (startInstant.isAfter(horizon)) {
            return false;
        }

        String eventType = item.path("eventType").asText("").toLowerCase(Locale.ROOT);
        String summary = item.path("summary").asText("").toLowerCase(Locale.ROOT);
        String organizerName = item.path("organizer").path("displayName").asText("").toLowerCase(Locale.ROOT);
        String organizerEmail = item.path("organizer").path("email").asText("").toLowerCase(Locale.ROOT);
        String creatorEmail = item.path("creator").path("email").asText("").toLowerCase(Locale.ROOT);

        if ("birthday".equals(eventType)) {
            return false;
        }
        if (summary.contains("birthday") || summary.contains("день рождения")) {
            return false;
        }
        if (organizerName.contains("birthdays") || organizerName.contains("дни рождения")) {
            return false;
        }
        if (organizerEmail.contains("holiday.calendar.google.com") || creatorEmail.contains("holiday.calendar.google.com")) {
            return false;
        }

        return true;
    }

    private boolean isManagedHealthGameEvent(JsonNode item) {
        String managed = item.path("extendedProperties").path("private").path(HEALTHGAME_MANAGED_KEY).asText("");
        if (HEALTHGAME_EVENT_KEY_VALUE.equalsIgnoreCase(managed)) {
            return true;
        }
        return item.path("summary").asText("").startsWith(HEALTHGAME_EVENT_PREFIX);
    }

    private String requireGoogleAccessToken(AuthenticatedUser authenticatedUser) {
        ExternalIntegrationEntity integration = externalIntegrationRepository.findByUserIdAndProvider(authenticatedUser.userId(), GOOGLE_PROVIDER)
                .orElseThrow(() -> new ConflictException("Google Calendar не подключен"));

        if (!"CONNECTED".equalsIgnoreCase(integration.getStatus())) {
            throw new ConflictException("Google Calendar не подключен");
        }

        IntegrationTokenEntity token = integrationTokenRepository.findByIntegrationId(integration.getId())
                .orElseThrow(() -> new ConflictException("Google Calendar не подключен"));

        if (token.getAccessToken() == null || token.getAccessToken().isBlank()) {
            throw new ConflictException("Google Calendar не подключен");
        }

        return ensureValidGoogleAccessToken(integration, token);
    }

    private String normalizeRedirectPath(String redirectPath) {
        if (redirectPath == null || redirectPath.isBlank()) {
            return "/extras/calendar";
        }
        String value = redirectPath.trim();
        if (!value.startsWith("/")) {
            value = "/" + value;
        }
        return value.startsWith("//") ? "/extras/calendar" : value;
    }

    private String ensureValidGoogleAccessToken(ExternalIntegrationEntity integration, IntegrationTokenEntity token) {
        if (!isTokenExpired(token)) {
            return token.getAccessToken();
        }

        if (token.getRefreshToken() == null || token.getRefreshToken().isBlank()) {
            throw new ConflictException("Подключение Google устарело. Подключите аккаунт заново.");
        }

        MultiValueMap<String, String> body = new LinkedMultiValueMap<>();
        body.add("client_id", googleClientId);
        body.add("client_secret", googleClientSecret);
        body.add("refresh_token", token.getRefreshToken());
        body.add("grant_type", "refresh_token");

        try {
            JsonNode response = googleOauthRestClient.post()
                    .uri("/token")
                    .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                    .body(body)
                    .retrieve()
                    .body(JsonNode.class);

            String refreshedAccessToken = response != null ? response.path("access_token").asText("") : "";
            if (refreshedAccessToken.isBlank()) {
                throw new ConflictException("Подключение Google устарело. Подключите аккаунт заново.");
            }

            long expiresInSeconds = response != null ? response.path("expires_in").asLong(3600) : 3600;
            token.setAccessToken(refreshedAccessToken);
            token.setExpiresAt(Instant.now().plusSeconds(Math.max(expiresInSeconds - 60, 300)));
            token.setUpdatedAt(Instant.now());
            integrationTokenRepository.save(token);

            log.info("Google access token refreshed: userId={}, integrationId={}", integration.getUserId(), integration.getId());
            return refreshedAccessToken;
        } catch (RestClientResponseException exception) {
            log.warn(
                    "Failed to refresh Google access token: userId={}, status={}, body={}",
                    integration.getUserId(),
                    exception.getStatusCode(),
                    exception.getResponseBodyAsString()
            );
            throw new ConflictException("Подключение Google устарело. Подключите аккаунт заново.");
        }
    }

    private String resolveGoogleAccessErrorMessage(RestClientResponseException exception) {
        String body = Optional.ofNullable(exception.getResponseBodyAsString()).orElse("").toLowerCase(Locale.ROOT);
        if (body.contains("insufficient") || body.contains("scope") || body.contains("forbidden")) {
            return "Недостаточно прав для работы с Google Calendar. Подключите аккаунт Google заново.";
        }
        return "Подключение Google устарело. Подключите аккаунт заново.";
    }

    private boolean isTokenExpired(IntegrationTokenEntity token) {
        return token.getExpiresAt() != null && token.getExpiresAt().isBefore(Instant.now().plusSeconds(30));
    }

    private UserEntity createGoogleUser(String email, String firstName, String avatarUrl) {
        UserEntity entity = new UserEntity();
        entity.setEmail(email);
        entity.setPhone(null);
        entity.setPasswordHash(passwordEncoder.encode(UUID.randomUUID().toString()));
        entity.setNickname(generateUniqueNickname(email, firstName));
        entity.setFirstName(firstName);
        entity.setAvatarUrl(avatarUrl);
        entity.setTimezone("Europe/Minsk");
        entity.setStatus("active");
        entity.setRegisteredAt(Instant.now());
        return entity;
    }

    private void saveIntegrationTokens(Long integrationId, OAuth2AuthorizedClient authorizedClient) {
        IntegrationTokenEntity tokenEntity = integrationTokenRepository.findByIntegrationId(integrationId)
                .orElseGet(IntegrationTokenEntity::new);
        tokenEntity.setIntegrationId(integrationId);
        tokenEntity.setAccessToken(authorizedClient.getAccessToken().getTokenValue());
        tokenEntity.setRefreshToken(
                authorizedClient.getRefreshToken() != null
                        ? authorizedClient.getRefreshToken().getTokenValue()
                        : tokenEntity.getRefreshToken()
        );
        tokenEntity.setExpiresAt(authorizedClient.getAccessToken().getExpiresAt());
        tokenEntity.setUpdatedAt(Instant.now());
        integrationTokenRepository.save(tokenEntity);
    }

    private String generateUniqueNickname(String email, String firstName) {
        String base = Optional.ofNullable(firstName)
                .filter(value -> !value.isBlank())
                .orElseGet(() -> email.substring(0, email.indexOf('@')))
                .toLowerCase(Locale.ROOT)
                .replaceAll("[^a-z0-9_]+", "");
        if (base.length() < 3) {
            base = "player";
        }
        base = base.substring(0, Math.min(base.length(), 18));

        String candidate = base;
        int counter = 1;
        while (userRepository.existsByNicknameIgnoreCase(candidate)) {
            candidate = base + counter;
            if (candidate.length() > 24) {
                candidate = candidate.substring(0, 24);
            }
            counter++;
        }
        return candidate;
    }

    private Optional<String> attribute(OAuth2User principal, String key) {
        Object value = principal.getAttributes().get(key);
        if (value instanceof String stringValue && !stringValue.isBlank()) {
            return Optional.of(stringValue.trim());
        }
        return Optional.empty();
    }

    private record HabitCalendarEventDraft(
            String title,
            LocalDateTime startAt,
            LocalDateTime endAt,
            String description,
            String integrationKey,
            String fallbackKey
    ) {
    }

    private record ExistingEventKeys(
            List<String> integrationKeys,
            List<String> fallbackKeys
    ) {
        private boolean contains(String integrationKey, String fallbackKey) {
            return integrationKeys.contains(integrationKey) || fallbackKeys.contains(fallbackKey);
        }
    }

}
