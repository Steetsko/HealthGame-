package com.healthgame.backend.integrations.application;

public record WeatherRecommendationResponse(
        String category,
        String title,
        String text,
        String icon
) {
}
