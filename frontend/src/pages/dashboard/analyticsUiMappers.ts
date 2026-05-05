import type { AnalyticsDayQuality, AnalyticsMetricKey } from "./analyticsTypes";

const weekdayMap: Record<string, string> = {
  mon: "ПН",
  monday: "ПН",
  tue: "ВТ",
  tuesday: "ВТ",
  wed: "СР",
  wednesday: "СР",
  thu: "ЧТ",
  thursday: "ЧТ",
  fri: "ПТ",
  friday: "ПТ",
  sat: "СБ",
  saturday: "СБ",
  sun: "ВС",
  sunday: "ВС"
};

const analyticsLabelMap: Record<string, string> = {
  healthScore: "Индекс здоровья",
  progress: "Прогресс",
  streak: "Серия",
  weakSpot: "Слабое место",
  forecast: "Прогноз",
  completed: "Выполнено",
  challenges: "Челленджи",
  stability: "Стабильность",
  strongDay: "Сильный день",
  emptySlot: "Пустой день",
  weeklyRhythm: "Ритм недели",
  pulseMap: "Карта импульса"
};

const metricLabelMap: Record<AnalyticsMetricKey, string> = {
  completion: "Выполнение",
  streak: "Серия",
  challenges: "Челленджи",
  stability: "Стабильность"
};

const statusMap: Record<string, string> = {
  strong: "Сильный день",
  medium: "Средний день",
  weak: "Слабый день",
  empty: "Пустой день",
  rest: "День отдыха",
  surge: "Рывок",
  slump: "Провал",
  "strong day": "Сильный день",
  "medium day": "Средний день",
  "weak day": "Слабый день",
  "empty slot": "Пустой день",
  "empty day": "Пустой день",
  "rest day": "День отдыха"
};

export function translateMetricLabel(label: AnalyticsMetricKey | string) {
  return metricLabelMap[label as AnalyticsMetricKey] ?? translateAnalyticsLabel(label);
}

export function translateAnalyticsLabel(label: string) {
  const normalized = label?.trim?.() ?? "";
  return analyticsLabelMap[normalized] ?? statusMap[normalized.toLowerCase()] ?? normalized;
}

export function translateDayStatus(status: string) {
  const normalized = status?.trim?.() ?? "";
  return statusMap[normalized.toLowerCase()] ?? normalized;
}

export function formatWeekdayRu(value: string) {
  const normalized = value.trim().toLowerCase();
  if (weekdayMap[normalized]) {
    return weekdayMap[normalized];
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split("-").map(Number);
    return new Date(year, month - 1, day)
      .toLocaleDateString("ru-RU", { weekday: "short" })
      .replace(".", "")
      .toUpperCase();
  }

  return value.toUpperCase();
}

export function getDayQualityLabel(percent: number, totalCount: number) {
  if (totalCount === 0) return translateDayStatus("rest");
  if (percent >= 100) return translateDayStatus("strong");
  if (percent >= 80) return translateDayStatus("surge");
  if (percent >= 50) return translateDayStatus("medium");
  if (percent > 0) return translateDayStatus("weak");
  return translateDayStatus("empty");
}

export function getDayQualityTone(percent: number, totalCount: number): AnalyticsDayQuality {
  if (totalCount === 0) return "rest";
  if (percent >= 100) return "strong";
  if (percent >= 80) return "surge";
  if (percent >= 50) return "medium";
  if (percent > 0) return "weak";
  return "empty";
}
