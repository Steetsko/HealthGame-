import type { AnalyticsSummaryCardData } from "./analyticsTypes";

type AnalyticsSummaryCardProps = {
  data: AnalyticsSummaryCardData;
};

export function AnalyticsSummaryCard({ data }: AnalyticsSummaryCardProps) {
  return (
    <article className={`dashboard-analytics-card dashboard-analytics-summary dashboard-analytics-summary-${data.tone ?? "default"}`}>
      <div className="dashboard-analytics-card-head">
        <span className="dashboard-analytics-card-kicker">{data.title}</span>
        {data.badge ? <span className="dashboard-analytics-card-badge">{data.badge}</span> : null}
      </div>

      <div className="dashboard-analytics-summary-body">
        <strong>{data.value}</strong>
        <p>{data.description}</p>
      </div>
    </article>
  );
}
