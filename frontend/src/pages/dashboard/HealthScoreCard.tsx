import { AnalyticsMetricMiniCard } from "./AnalyticsMetricMiniCard";
import { translateMetricLabel } from "./analyticsUiMappers";
import type { AnalyticsHealthCardData } from "./analyticsTypes";

type HealthScoreCardProps = {
  data: AnalyticsHealthCardData;
};

export function HealthScoreCard({ data }: HealthScoreCardProps) {
  return (
    <article className="dashboard-analytics-card dashboard-analytics-card-health">
      <div className="dashboard-analytics-card-head">
        <span className="dashboard-analytics-card-kicker">Индекс здоровья</span>
      </div>

      <div className="dashboard-analytics-health-layout">
        <div
          className="dashboard-analytics-health-ring"
          style={{ ["--dashboard-health-progress" as string]: `${Math.max(0, Math.min(100, data.score))}%` }}
          role="progressbar"
          aria-label={`Индекс здоровья: ${data.score} из 100`}
          aria-valuenow={data.score}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div className="dashboard-analytics-health-ring-inner">
            <strong>{data.score}</strong>
            <span>/ 100</span>
          </div>
        </div>

        <div className="dashboard-analytics-health-copy">
          <strong>{data.state}</strong>
          <p>{data.summary}</p>
        </div>
      </div>

      <div className="dashboard-analytics-metrics-grid">
        {data.metrics.map((metric) => (
          <AnalyticsMetricMiniCard
            key={metric.key}
            label={translateMetricLabel(metric.key)}
            value={`${metric.value}%`}
          />
        ))}
      </div>
    </article>
  );
}
