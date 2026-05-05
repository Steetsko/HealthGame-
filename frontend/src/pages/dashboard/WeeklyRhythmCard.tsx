import { formatWeekdayRu, getDayQualityLabel, getDayQualityTone } from "./analyticsUiMappers";
import type { AnalyticsWeekDay } from "./analyticsTypes";

type WeeklyRhythmCardProps = {
  days: AnalyticsWeekDay[];
  closedCount: number;
  onSelectDay: (date: string) => void;
};

export function WeeklyRhythmCard({ days, closedCount, onSelectDay }: WeeklyRhythmCardProps) {
  return (
    <article className="dashboard-analytics-panel-card">
      <div className="dashboard-analytics-panel-head">
        <div>
          <strong>Ритм недели</strong>
          <p>Здесь видно не просто количество, а качество недели: сильные дни удерживают форму, слабые сразу бросаются в глаза.</p>
        </div>
        <span>{closedCount} закрыто</span>
      </div>

      <div className="dashboard-analytics-days-grid">
        {days.map((day) => {
          const tone = getDayQualityTone(day.completionPercent, day.totalCount);
          const fillHeight = Math.max(day.totalCount ? 16 : 8, day.completionPercent);
          return (
            <button
              key={`${day.date}-rhythm`}
              type="button"
              className={`dashboard-analytics-day-card dashboard-analytics-day-card-${tone}`}
              onClick={() => onSelectDay(day.date)}
            >
              <span className="dashboard-analytics-day-weekday">{formatWeekdayRu(day.date)}</span>
              <div
                className="dashboard-analytics-day-bar"
                role="progressbar"
                aria-label={`${formatWeekdayRu(day.date)}: выполнено ${day.completedCount} из ${day.totalCount || 0}, ${day.completionPercent}%`}
                aria-valuenow={day.completionPercent}
                aria-valuemin={0}
                aria-valuemax={100}
              >
                <div className="dashboard-analytics-day-bar-fill" style={{ height: `${fillHeight}%` }} />
              </div>
              <strong>{day.completedCount}/{day.totalCount || 0}</strong>
              <small>{day.completionPercent}%</small>
              <em>{getDayQualityLabel(day.completionPercent, day.totalCount)}</em>
            </button>
          );
        })}
      </div>
    </article>
  );
}
