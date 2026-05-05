package com.healthgame.backend.integrations.application;

import com.fasterxml.jackson.databind.JsonNode;
import com.healthgame.backend.identity.infrastructure.persistence.UserEntity;
import com.healthgame.backend.identity.infrastructure.persistence.UserRepository;
import com.healthgame.backend.identity.infrastructure.security.AuthenticatedUser;
import com.healthgame.backend.integrations.infrastructure.persistence.ExternalIntegrationEntity;
import com.healthgame.backend.integrations.infrastructure.persistence.ExternalIntegrationRepository;
import com.healthgame.backend.shared.domain.ResourceNotFoundException;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

@Service
public class WeatherWellnessIntegrationService {

    private static final String WEATHER_PROVIDER = "open-meteo";

    private final UserRepository userRepository;
    private final ExternalIntegrationRepository externalIntegrationRepository;
    private final RestClient geocodingRestClient;
    private final RestClient forecastRestClient;

    public WeatherWellnessIntegrationService(
            UserRepository userRepository,
            ExternalIntegrationRepository externalIntegrationRepository,
            RestClient.Builder restClientBuilder
    ) {
        this.userRepository = userRepository;
        this.externalIntegrationRepository = externalIntegrationRepository;
        this.geocodingRestClient = restClientBuilder.baseUrl("https://geocoding-api.open-meteo.com").build();
        this.forecastRestClient = restClientBuilder.baseUrl("https://api.open-meteo.com").build();
    }

    @Transactional
    public WeatherWellnessResponse getWellnessForecast(AuthenticatedUser authenticatedUser, String cityHint) {
        UserEntity user = userRepository.findById(authenticatedUser.userId())
                .orElseThrow(() -> new ResourceNotFoundException("User was not found"));

        String city = (cityHint == null || cityHint.isBlank()) ? deriveCityFromTimezone(user.getTimezone()) : cityHint.trim();
        JsonNode geocoding;
        try {
            geocoding = geocodingRestClient.get()
                    .uri(uriBuilder -> uriBuilder.path("/v1/search")
                            .queryParam("name", city)
                            .queryParam("count", 1)
                            .queryParam("language", "ru")
                            .build())
                    .retrieve()
                    .body(JsonNode.class);
        } catch (RestClientException ex) {
            return fallbackWeatherResponse(city);
        }

        JsonNode firstResult = geocoding != null
                && geocoding.has("results")
                && geocoding.get("results").isArray()
                && !geocoding.get("results").isEmpty()
                ? geocoding.get("results").get(0)
                : null;

        if (firstResult == null) {
            return new WeatherWellnessResponse(
                    city,
                    "Город не найден",
                    0,
                    0,
                    0,
                    0,
                    0,
                    List.of(new WeatherRecommendationResponse(
                            "Фокус",
                            "Проверьте название города",
                            "Погоду не удалось загрузить. Уточните город, чтобы получить полезные рекомендации на день.",
                            "focus"
                    ))
            );
        }

        double latitude = firstResult.path("latitude").asDouble();
        double longitude = firstResult.path("longitude").asDouble();
        String resolvedCity = firstResult.path("name").asText(city);

        JsonNode forecast;
        try {
            forecast = forecastRestClient.get()
                    .uri(uriBuilder -> uriBuilder
                            .path("/v1/forecast")
                            .queryParam("latitude", latitude)
                            .queryParam("longitude", longitude)
                            .queryParam("current", "temperature_2m,apparent_temperature,relative_humidity_2m,precipitation,wind_speed_10m,weather_code")
                            .build())
                    .retrieve()
                    .body(JsonNode.class);
        } catch (RestClientException ex) {
            return fallbackWeatherResponse(resolvedCity);
        }

        JsonNode current = forecast.path("current");
        double temperature = current.path("temperature_2m").asDouble(0);
        double apparentTemperature = current.path("apparent_temperature").asDouble(temperature);
        double humidity = current.path("relative_humidity_2m").asDouble(0);
        double precipitation = current.path("precipitation").asDouble(0);
        double windSpeed = current.path("wind_speed_10m").asDouble(0);
        int weatherCode = current.path("weather_code").asInt(0);

        upsertWeatherIntegration(user.getId(), resolvedCity);

        return new WeatherWellnessResponse(
                resolvedCity,
                mapWeatherCode(weatherCode),
                temperature,
                apparentTemperature,
                windSpeed,
                humidity,
                precipitation,
                buildRecommendations(temperature, windSpeed, humidity, precipitation, weatherCode)
        );
    }

    private void upsertWeatherIntegration(Long userId, String city) {
        ExternalIntegrationEntity entity = externalIntegrationRepository.findByUserIdAndProvider(userId, WEATHER_PROVIDER)
                .orElseGet(ExternalIntegrationEntity::new);
        entity.setUserId(userId);
        entity.setProvider(WEATHER_PROVIDER);
        entity.setExternalUser(city);
        entity.setStatus("CONNECTED");
        if (entity.getCreatedAt() == null) {
            entity.setCreatedAt(Instant.now());
        }
        externalIntegrationRepository.save(entity);
    }

    private String deriveCityFromTimezone(String timezone) {
        if (timezone == null || timezone.isBlank()) {
            return "Minsk";
        }
        String[] parts = timezone.split("/");
        String last = parts[parts.length - 1].replace('_', ' ');
        return last.isBlank() ? "Minsk" : last;
    }

    private String mapWeatherCode(int weatherCode) {
        return switch (weatherCode) {
            case 0 -> "Ясно";
            case 1 -> "Почти ясно";
            case 2, 3 -> "Пасмурно";
            case 45, 48 -> "Туман";
            case 51, 53, 55, 61, 63, 65, 80, 81, 82 -> "Дождь";
            case 71, 73, 75, 85, 86 -> "Снег";
            case 95, 96, 99 -> "Гроза";
            default -> "Спокойная погода";
        };
    }

    private List<WeatherRecommendationResponse> buildRecommendations(
            double temperature,
            double windSpeed,
            double humidity,
            double precipitation,
            int weatherCode
    ) {
        List<WeatherRecommendationResponse> recommendations = new ArrayList<>();

        if (temperature >= 27) {
            recommendations.add(new WeatherRecommendationResponse(
                    "Вода",
                    "Увеличьте норму воды",
                    "Сегодня тепло, добавьте 1–2 стакана воды и не планируйте интенсивную активность на пик дня.",
                    "water"
            ));
            recommendations.add(new WeatherRecommendationResponse(
                    "Тренировки",
                    "Сместите нагрузку на утро или вечер",
                    "Кардио и силовые лучше выполнить до жары или после заката. В середине дня держите умеренный темп.",
                    "training"
            ));
        } else if (temperature <= -3) {
            recommendations.add(new WeatherRecommendationResponse(
                    "Безопасность",
                    "Сократите активность на улице",
                    "На улице морозно. Лучше выбрать короткую прогулку или домашнюю тренировку.",
                    "shield"
            ));
            recommendations.add(new WeatherRecommendationResponse(
                    "Тренировки",
                    "Сделайте домашнюю разминку",
                    "10–20 минут суставной гимнастики и мобильности помогут поддержать форму без риска переохлаждения.",
                    "mobility"
            ));
        } else if (temperature >= 10 && temperature <= 24 && precipitation <= 0.1 && windSpeed <= 20) {
            recommendations.add(new WeatherRecommendationResponse(
                    "Тренировки",
                    "Оптимальный день для тренировки на улице",
                    "Подходит для пробежки, быстрой ходьбы или интервальной тренировки 20–40 минут.",
                    "run"
            ));
        }

        if (precipitation >= 0.3 || isRainWeather(weatherCode)) {
            recommendations.add(new WeatherRecommendationResponse(
                    "Тренировки",
                    "Тренировку лучше сделать в помещении",
                    "Осадки повышают риск пропустить активность. Выберите домашнее кардио, силовую с собственным весом или растяжку.",
                    "activity"
            ));
        }
        if (windSpeed >= 22) {
            recommendations.add(new WeatherRecommendationResponse(
                    "Безопасность",
                    "Выберите спокойный маршрут",
                    "Сильный ветер повышает нагрузку. Лучше снизить темп и избегать длительных тренировок на улице.",
                    "wind"
            ));
        }
        if (humidity >= 80) {
            recommendations.add(new WeatherRecommendationResponse(
                    "Восстановление",
                    "Следите за самочувствием",
                    "Высокая влажность может усиливать усталость. Держите умеренный темп и делайте паузы.",
                    "recovery"
            ));
        }
        if (isCloudyWeather(weatherCode) && recommendations.size() < 4) {
            recommendations.add(new WeatherRecommendationResponse(
                    "Фокус",
                    "Соберите день вокруг простых задач",
                    "Пасмурная погода может снижать энергию. Запланируйте короткую тренировку и 1–2 ключевые задачи.",
                    "focus"
            ));
        }

        if (recommendations.size() < 3) {
            recommendations.add(new WeatherRecommendationResponse(
                    "Тренировки",
                    "Базовый план: 8-10 тысяч шагов",
                    "Даже в загруженный день удержите минимум активности: шаги, короткая разминка и 5 минут растяжки.",
                    "steps"
            ));
        }
        if (recommendations.size() < 4) {
            recommendations.add(new WeatherRecommendationResponse(
                    "Восстановление",
                    "Оставьте время на сон",
                    "Стабильный сон 7–8 часов помогает восстановить ресурс и поддерживать темп без выгорания.",
                    "sleep"
            ));
        }

        if (recommendations.isEmpty()) {
            recommendations.add(new WeatherRecommendationResponse(
                    "Восстановление",
                    "Держите ровный темп",
                    "Погода спокойная: сохраните комфортный ритм, не перегружайте день и оставьте место для восстановления.",
                    "recovery"
            ));
        }

        return recommendations.stream().limit(4).toList();
    }

    private WeatherWellnessResponse fallbackWeatherResponse(String city) {
        return new WeatherWellnessResponse(
                city,
                "Сервис погоды временно недоступен",
                0,
                0,
                0,
                0,
                0,
                List.of(new WeatherRecommendationResponse(
                        "Фокус",
                        "Пока используйте базовый режим дня",
                        "Погодные данные временно недоступны. Держите умеренный темп, добавьте воду и лёгкую активность.",
                        "focus"
                ))
        );
    }

    private boolean isComfortableDay(double temperature, double precipitation, double windSpeed) {
        return temperature >= 10 && temperature <= 22 && precipitation <= 0 && windSpeed <= 25;
    }

    private boolean isCloudyWeather(int weatherCode) {
        return weatherCode == 1 || weatherCode == 2 || weatherCode == 3 || weatherCode == 45 || weatherCode == 48;
    }

    private boolean isRainWeather(int weatherCode) {
        return switch (weatherCode) {
            case 51, 53, 55, 61, 63, 65, 80, 81, 82, 95, 96, 99 -> true;
            default -> false;
        };
    }
}
