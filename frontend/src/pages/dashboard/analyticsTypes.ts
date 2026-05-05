export type AnalyticsMetricKey = "completion" | "streak" | "challenges" | "stability";

export type AnalyticsRiskTone = "low" | "mid" | "high";

export type AnalyticsDayQuality =
  | "strong"
  | "medium"
  | "weak"
  | "empty"
  | "rest"
  | "surge"
  | "slump";

export type AnalyticsWeekDay = {
  date: string;
  completedCount: number;
  totalCount: number;
  completionPercent: number;
};

export type AnalyticsHealthMetric = {
  key: AnalyticsMetricKey;
  value: number;
};

export type AnalyticsHealthCardData = {
  score: number;
  state: string;
  summary: string;
  metrics: AnalyticsHealthMetric[];
};

export type AnalyticsSummaryCardData = {
  title: string;
  value: string;
  description: string;
  badge?: string;
  tone?: AnalyticsRiskTone | "default";
};
