package com.healthgame.backend.integrations.application;

public record WeatherWellnessResponse(
        String city,
        String condition,
        double temperatureC,
        double apparentTemperatureC,
        double windSpeed,
        double humidity,
        double precipitation,
        java.util.List<WeatherRecommendationResponse> recommendations
) {
}
