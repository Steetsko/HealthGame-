package com.healthgame.backend.identity.application;

public record DashboardSummaryResponse(
        int level,
        int xp,
        int nextLevelXp,
        int dailyScore,
        int streakDays,
        int todayCompletedCount,
        int todayPlannedCount,
        int weeklyCompletedCount,
        int weeklyPlannedCount,
        int weeklyProgressPercent,
        int activeChallengesCount,
        String insight
) {
}