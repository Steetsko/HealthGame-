type AnalyticsMetricMiniCardProps = {
  label: string;
  value: string;
};

export function AnalyticsMetricMiniCard({ label, value }: AnalyticsMetricMiniCardProps) {
  return (
    <div className="dashboard-analytics-metric-card">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
