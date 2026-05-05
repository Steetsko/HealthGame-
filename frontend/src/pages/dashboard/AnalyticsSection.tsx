import { AnalyticsSummaryCard } from "./AnalyticsSummaryCard";
import { HealthScoreCard } from "./HealthScoreCard";
import { PulseMapCard } from "./PulseMapCard";
import { WeeklyRhythmCard } from "./WeeklyRhythmCard";
import type { AnalyticsHealthCardData, AnalyticsSummaryCardData, AnalyticsWeekDay } from "./analyticsTypes";

type AnalyticsSectionProps = {
  seasonHabitCount: number;
  healthCard: AnalyticsHealthCardData;
  summaryCards: AnalyticsSummaryCardData[];
  days: AnalyticsWeekDay[];
  weeklyClosedCount: number;
  isLoading: boolean;
  isError: boolean;
  isEmpty: boolean;
  onSelectDay: (date: string) => void;
};

function AnalyticsSkeleton() {
  return (
    <div className="dashboard-analytics-skeleton" aria-hidden="true">
      <div className="dashboard-analytics-skeleton-top">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="dashboard-analytics-skeleton-card" />
        ))}
      </div>
      <div className="dashboard-analytics-skeleton-bottom">
        <div className="dashboard-analytics-skeleton-panel" />
        <div className="dashboard-analytics-skeleton-panel" />
      </div>
    </div>
  );
}

export function AnalyticsSection({
  seasonHabitCount,
  healthCard,
  summaryCards,
  days,
  weeklyClosedCount,
  isLoading,
  isError,
  isEmpty,
  onSelectDay
}: AnalyticsSectionProps) {
  return (
    <article className="dashboard-neo-panel dashboard-analytics-shell glass-card dashboard-neo-surface-soft">
      <div className="dashboard-panel-head">
        <div>
          <p className="app-kicker dashboard-neo-kicker">Аналитика</p>
          <h2>Аналитика прогресса и темпа</h2>
        </div>
        <span className="dashboard-chip dashboard-chip-soft">{seasonHabitCount} привычек в сезоне</span>
      </div>

      {isLoading ? (
        <AnalyticsSkeleton />
      ) : isError ? (
        <div className="dashboard-analytics-state">
          <strong>Не удалось загрузить аналитику</strong>
          <p>Попробуйте обновить страницу или вернуться позже.</p>
        </div>
      ) : isEmpty ? (
        <div className="dashboard-analytics-state">
          <strong>Пока недостаточно данных для аналитики</strong>
          <p>Выполните несколько привычек, чтобы система рассчитала ритм недели.</p>
        </div>
      ) : (
        <>
          <div className="dashboard-analytics-top">
            <HealthScoreCard data={healthCard} />
            {summaryCards.map((card) => (
              <AnalyticsSummaryCard key={card.title} data={card} />
            ))}
          </div>

          <div className="dashboard-analytics-bottom">
            <WeeklyRhythmCard days={days} closedCount={weeklyClosedCount} onSelectDay={onSelectDay} />
            <PulseMapCard days={days} onSelectDay={onSelectDay} />
          </div>
        </>
      )}
    </article>
  );
}
