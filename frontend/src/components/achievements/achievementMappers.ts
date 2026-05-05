import type { Achievement } from "../../lib/types";

export type AchievementRarity = "common" | "rare" | "epic" | "legendary";

export type NormalizedAchievement = {
  id: string;
  code: string;
  title: string;
  description: string;
  iconKey: string;
  rarity: AchievementRarity;
  rarityLabel: string;
  unlocked: boolean;
  unlockedAt: string | null;
  source: string | null;
  progressCurrent: number | null;
  progressTarget: number | null;
  progressPercent: number | null;
  statusLabel: string;
  progressLabel: string | null;
  tone: "default" | "green" | "yellow" | "orange" | "red";
};

const rarityMap: Record<string, AchievementRarity> = {
  common: "common",
  rare: "rare",
  epic: "epic",
  legendary: "legendary"
};

const rarityLabelMap: Record<AchievementRarity, string> = {
  common: "Обычное",
  rare: "Редкое",
  epic: "Эпическое",
  legendary: "Легендарное"
};

const titleMap: Record<string, string> = {
  FIRST_CHECKIN: "Первый шаг",
  CHALLENGE_JOINER: "Командный игрок",
  FIRST_COMMENT: "Первый комментарий",
  CHALLENGE_CREATOR: "Создатель маршрута",
  CHALLENGE_FINISHER: "Финишер",
  STEADY_RHYTHM: "Стабильный ритм",
  HABIT_ROOKIE: "Ритм новичка",
  TEAM_PACE: "Командный темп",
  WATER_START: "Водный старт",
  HABIT_STRENGTH: "Сила привычки",
  CHALLENGE_TRAVELER: "Исследователь челленджей",
  CHALLENGE_VETERAN: "Ветеран челленджей",
  FIRST_POST: "Голос сообщества",
  FIRST_REACTION: "Первая реакция",
  LEVEL_GREEN: "Зелёный ранг",
  LEVEL_YELLOW: "Жёлтый ранг",
  LEVEL_ORANGE: "Оранжевый ранг",
  LEVEL_RED: "Красный ранг"
};

const descriptionMap: Record<string, string> = {
  FIRST_CHECKIN: "Получено за первую отмеченную привычку.",
  CHALLENGE_JOINER: "Получено за вступление в первый челлендж.",
  FIRST_COMMENT: "Получено за первый комментарий в блоге или обсуждении челленджа.",
  CHALLENGE_CREATOR: "Получено за создание первого челленджа.",
  CHALLENGE_FINISHER: "Получено за завершение первого челленджа.",
  HABIT_ROOKIE: "Получено за 3 выполненные привычки.",
  STEADY_RHYTHM: "Получено за выполнение 10 привычек.",
  TEAM_PACE: "Получено за прохождение 3 челленджей.",
  WATER_START: "Получено за выполнение 3 привычек из категории Вода.",
  HABIT_STRENGTH: "Получено за серию из 7 дней.",
  CHALLENGE_TRAVELER: "Получено за участие в 3 челленджах.",
  CHALLENGE_VETERAN: "Получено за участие в 10 челленджах.",
  FIRST_POST: "Получено за публикацию первого поста.",
  FIRST_REACTION: "Получено за первую реакцию на пост.",
  LEVEL_GREEN: "Получено за достижение 10 уровня.",
  LEVEL_YELLOW: "Получено за достижение 11 уровня.",
  LEVEL_ORANGE: "Получено за достижение 31 уровня.",
  LEVEL_RED: "Получено за достижение 51 уровня."
};

const iconAliases: Record<string, string> = {
  first_step: "sparkles",
  first_checkin: "sparkles",
  challenge_joiner: "users",
  first_comment: "sparkles",
  challenge_creator: "target",
  challenge_finisher: "trophy",
  habit_rookie: "medal",
  steady_rhythm: "calendar",
  team_pace: "users",
  water_start: "heart",
  habit_strength: "flame",
  challenge_traveler: "compass",
  challenge_veteran: "crown",
  first_post: "pen",
  first_reaction: "bolt",
  level_green: "leaf",
  level_yellow: "sun",
  level_orange: "flame",
  level_red: "shield"
};

const toneByCode: Record<string, NormalizedAchievement["tone"]> = {
  LEVEL_GREEN: "green",
  LEVEL_YELLOW: "yellow",
  LEVEL_ORANGE: "orange",
  LEVEL_RED: "red"
};

function normalizeIconKey(value: string | null | undefined) {
  if (!value) return "award";
  const normalized = value.trim().toLowerCase().replace(/[\s-]+/g, "_");
  return iconAliases[normalized] ?? normalized;
}

export function normalizeAchievementRarity(rarity: string | null | undefined): AchievementRarity {
  if (!rarity) return "common";
  return rarityMap[rarity.trim().toLowerCase()] ?? "common";
}

export function translateAchievementRarity(rarity: string | null | undefined) {
  return rarityLabelMap[normalizeAchievementRarity(rarity)];
}

export function normalizeAchievement(raw: Achievement): NormalizedAchievement {
  const rarity = normalizeAchievementRarity(raw.rarity);
  const code = raw.code || "UNKNOWN";
  const progressCurrent = raw.progressCurrent ?? null;
  const progressTarget = raw.progressTarget ?? null;
  const progressPercent =
    progressCurrent != null && progressTarget != null && progressTarget > 0
      ? Math.max(0, Math.min(100, Math.round((progressCurrent / progressTarget) * 100)))
      : null;
  const unlocked =
    typeof raw.unlocked === "boolean"
      ? raw.unlocked
      : Boolean(raw.awardedAt || raw.unlockedAt);
  const unlockedAt = raw.unlockedAt ?? raw.awardedAt ?? null;

  return {
    id: String(raw.awardId ?? raw.id ?? `${code}-${unlockedAt ?? "locked"}`),
    code,
    title: raw.title?.trim() || titleMap[code] || raw.name || "Новое достижение",
    description:
      raw.description?.trim() ||
      descriptionMap[code] ||
      "Продолжайте в том же духе, чтобы открывать новые награды.",
    iconKey: normalizeIconKey(raw.icon || code),
    rarity,
    rarityLabel: rarityLabelMap[rarity],
    unlocked,
    unlockedAt,
    source: raw.source ?? null,
    progressCurrent,
    progressTarget,
    progressPercent,
    statusLabel: unlocked ? "Получено" : "Не получено",
    progressLabel: progressCurrent != null && progressTarget != null ? `${progressCurrent} из ${progressTarget}` : null,
    tone: toneByCode[code] ?? "default"
  };
}
