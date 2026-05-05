import { formatWeekdayRu, getDayQualityLabel, getDayQualityTone } from "./analyticsUiMappers";
import type { AnalyticsWeekDay } from "./analyticsTypes";

type PulseMapCardProps = {
  days: AnalyticsWeekDay[];
  onSelectDay: (date: string) => void;
};

export function PulseMapCard({ days, onSelectDay }: PulseMapCardProps) {
  return (
    <article className="dashboard-analytics-panel-card">
      <div className="dashboard-analytics-panel-head">
        <div>
          <strong>Карта импульса</strong>
          <p>Каждый день получает своё состояние: это помогает быстро понять, где ты возвращаешь игру.</p>
        </div>
        <span>7 дней</span>
      </div>

      <div className="dashboard-analytics-pulse-grid">
        {days.map((day) => {
          const tone = getDayQualityTone(day.completionPercent, day.totalCount);
          return (
            <button
              key={`${day.date}-pulse`}
              type="button"
              className={`dashboard-analytics-pulse-card dashboard-analytics-pulse-card-${tone}`}
              onClick={() => onSelectDay(day.date)}
            >
              <span>{formatWeekdayRu(day.date)}</span>
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
