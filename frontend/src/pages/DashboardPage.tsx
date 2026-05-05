
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { AchievementCard } from "../components/achievements/AchievementCard";
import { AchievementIcon } from "../components/achievements/AchievementIcon";
import { normalizeAchievement } from "../components/achievements/achievementMappers";
import {
  checkInHabit,
  createHabit,
  getAchievements,
  getCurrentUser,
  getDashboardSummary,
  getHabitCategories,
  getHabitTimeline,
  getHabits,
  getMyChallenges,
  getTodayHabits,
  updateHabit,
  type HabitPayload
} from "../lib/api";
import { getApiErrorMessage } from "../lib/errors";
import { useAuthStore } from "../lib/auth";
import type { Habit, HabitTimelineDay, TodayHabit } from "../lib/types";
import { AnalyticsSection } from "./dashboard/AnalyticsSection";
import type { AnalyticsHealthCardData, AnalyticsSummaryCardData, AnalyticsWeekDay } from "./dashboard/analyticsTypes";

type ToastState = { tone: "success" | "error"; text: string };

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

function addDaysIso(days: number) {
  const base = new Date();
  const dt = new Date(base.getFullYear(), base.getMonth(), base.getDate() + days);
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, "0");
  const d = String(dt.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function buildWeekDates() {
  return Array.from({ length: 7 }, (_, index) => addDaysIso(index));
}

function getInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function formatWeekday(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("ru-RU", { weekday: "short" });
}

function formatDayLabel(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit" });
}

function formatTarget(targetValue: number | null, unit: string | null) {
  if (targetValue == null && !unit) return "Без цели";
  if (targetValue == null) return unit ?? "";
  return `${targetValue} ${unit ?? ""}`.trim();
}

function createSchedule() {
  return { dayOfWeek: null, timeOfDay: "09:00:00", minTimesPerDay: 1, isEnabled: true };
}

function createInitialHabitForm(categoryId = 1): HabitPayload {
  return {
    categoryId,
    name: "",
    description: "",
    startDate: todayIsoDate(),
    endDate: addDaysIso(30),
    targetValue: 1,
    unit: "раз",
    frequency: "DAILY",
    isActive: true,
    schedules: [createSchedule()]
  };
}

function clampPercent(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function average(values: number[]) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function DashboardPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const accessToken = useAuthStore((state) => state.accessToken);
  const [selectedHabitId, setSelectedHabitId] = useState<number | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(todayIsoDate());
  const [expandedDays, setExpandedDays] = useState<string[]>([]);
  const [editingHabitId, setEditingHabitId] = useState<number | null>(null);
  const [timelineByHabit, setTimelineByHabit] = useState<Record<number, HabitTimelineDay[]>>({});
  const [newHabitForm, setNewHabitForm] = useState<HabitPayload>(createInitialHabitForm());
  const [toast, setToast] = useState<ToastState | null>(null);

  const meQuery = useQuery({ queryKey: ["me"], queryFn: getCurrentUser, enabled: Boolean(accessToken) });
  const summaryQuery = useQuery({ queryKey: ["dashboard-summary"], queryFn: getDashboardSummary, enabled: Boolean(accessToken) });
  const habitsQuery = useQuery({ queryKey: ["habits"], queryFn: getHabits, enabled: Boolean(accessToken) });
  const todayQuery = useQuery({ queryKey: ["today-habits"], queryFn: getTodayHabits, enabled: Boolean(accessToken) });
  const myChallengesQuery = useQuery({ queryKey: ["my-challenges"], queryFn: getMyChallenges, enabled: Boolean(accessToken) });
  const achievementsQuery = useQuery({ queryKey: ["achievements"], queryFn: getAchievements, enabled: Boolean(accessToken) });
  const categoriesQuery = useQuery({ queryKey: ["habit-categories"], queryFn: getHabitCategories, enabled: Boolean(accessToken) });

  const habits = habitsQuery.data?.content ?? [];
  const todayHabits = todayQuery.data ?? [];
  const challenges = myChallengesQuery.data?.content ?? [];
  const achievements = achievementsQuery.data ?? [];
  const categories = categoriesQuery.data ?? [];
  const summary = summaryQuery.data;
  const weekDates = useMemo(() => buildWeekDates(), []);
  const selectedHabit = useMemo(() => habits.find((habit) => habit.id === selectedHabitId) ?? null, [habits, selectedHabitId]);
  const selectedDayEntry = useMemo(
    () => timelineByHabit[selectedHabitId ?? -1]?.find((day) => day.date === selectedDate) ?? null,
    [timelineByHabit, selectedHabitId, selectedDate]
  );
  const firstPendingTodayHabit = useMemo(() => todayHabits.find((habit) => !habit.completedToday) ?? null, [todayHabits]);

  useEffect(() => {
    if (!toast) return undefined;
    const timeout = window.setTimeout(() => setToast(null), 2800);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  useEffect(() => {
    if (!categories.length) return;
    setNewHabitForm((current) => (current.categoryId === 1 ? { ...current, categoryId: categories[0].id } : current));
  }, [categories]);

  useEffect(() => {
    if (!habits.length) {
      setTimelineByHabit({});
      setSelectedHabitId(null);
      return;
    }

    let cancelled = false;
    (async () => {
      const entries = await Promise.all(
        habits.map(async (habit) => ({ habitId: habit.id, timeline: await getHabitTimeline(habit.id, 7) }))
      );

      if (cancelled) return;
      const next: Record<number, HabitTimelineDay[]> = {};
      for (const entry of entries) next[entry.habitId] = entry.timeline;
      setTimelineByHabit(next);
    })().catch(() => {
      if (!cancelled) setTimelineByHabit({});
    });

    return () => {
      cancelled = true;
    };
  }, [habits]);

  useEffect(() => {
    if (!selectedHabit && habits.length) {
      setSelectedHabitId(habits[0].id);
    }
  }, [habits, selectedHabit]);

  const refreshAll = async () => {
    await Promise.all([
      qc.invalidateQueries({ queryKey: ["me"] }),
      qc.invalidateQueries({ queryKey: ["dashboard-summary"] }),
      qc.invalidateQueries({ queryKey: ["habits"] }),
      qc.invalidateQueries({ queryKey: ["today-habits"] }),
      qc.invalidateQueries({ queryKey: ["my-challenges"] }),
      qc.invalidateQueries({ queryKey: ["achievements"] })
    ]);
  };

  const markHabitCompletedLocal = (habitId: number, date: string, value: number) => {
    setTimelineByHabit((current) => ({
      ...current,
      [habitId]: (current[habitId] ?? []).map((day) => (day.date === date ? { ...day, completed: true, value } : day))
    }));

    qc.setQueryData<TodayHabit[]>(["today-habits"], (current) =>
      (current ?? []).map((habit) =>
        habit.id === habitId && habit.date === date ? { ...habit, completedToday: true } : habit
      )
    );
  };

  const createHabitMutation = useMutation({
    mutationFn: createHabit,
    onSuccess: async () => {
      setEditingHabitId(null);
      setNewHabitForm(createInitialHabitForm(categories[0]?.id ?? 1));
      setToast({ tone: "success", text: "Новая привычка добавлена в сезонный план." });
      await refreshAll();
    },
    onError: (error) => {
      setToast({ tone: "error", text: getApiErrorMessage(error, "Не удалось добавить привычку.") });
    }
  });

  const updateHabitMutation = useMutation({
    mutationFn: ({ habitId, payload }: { habitId: number; payload: HabitPayload }) => updateHabit(habitId, payload),
    onSuccess: async () => {
      setEditingHabitId(null);
      setToast({ tone: "success", text: "Привычка обновлена. План дня стал точнее." });
      await refreshAll();
    },
    onError: (error) => {
      setToast({ tone: "error", text: getApiErrorMessage(error, "Не удалось обновить привычку.") });
    }
  });

  const checkInMutation = useMutation({
    mutationFn: ({ habitId, date, value }: { habitId: number; date: string; value: number }) =>
      checkInHabit(habitId, {
        checkinDate: date,
        value,
        comment: `Выполнение привычки ${date}`,
        source: "manual"
      }),
    onSuccess: async (_, variables) => {
      markHabitCompletedLocal(variables.habitId, variables.date, variables.value);
      setToast({ tone: "success", text: "Привычка закрыта. Ритм дня вырос." });
      await refreshAll();
    },
    onError: (error) => {
      setToast({ tone: "error", text: getApiErrorMessage(error, "Не удалось отметить выполнение.") });
    }
  });

  const weekOverview = useMemo(
    () =>
      weekDates.map((date) => {
        const habitsForDate = habits
          .map((habit) => {
            const day = timelineByHabit[habit.id]?.find((item) => item.date === date);
            if (!day || !day.scheduled) return null;
            return { habit, day };
          })
          .filter((item): item is { habit: Habit; day: HabitTimelineDay } => Boolean(item));

        const completedCount = habitsForDate.filter((item) => item.day.completed).length;
        const totalCount = habitsForDate.length;

        return {
          date,
          habits: habitsForDate,
          completedCount,
          totalCount,
          completionPercent: totalCount ? Math.round((completedCount / totalCount) * 100) : 0
        };
      }),
    [habits, timelineByHabit, weekDates]
  );

  const selectedDayOverview = useMemo(
    () => weekOverview.find((day) => day.date === selectedDate) ?? null,
    [weekOverview, selectedDate]
  );

  function submitNewHabit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (editingHabitId) {
      updateHabitMutation.mutate({ habitId: editingHabitId, payload: newHabitForm });
      return;
    }
    createHabitMutation.mutate(newHabitForm);
  }

  function toggleExpandedDay(date: string) {
    setExpandedDays((current) => (current.includes(date) ? current.filter((item) => item !== date) : [...current, date]));
  }

  function scrollToHabitForm() {
    document.getElementById("create-habit-form")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function startCreateHabitForDate(date: string) {
    setEditingHabitId(null);
    setSelectedDate(date);
    setNewHabitForm({
      ...createInitialHabitForm(categories[0]?.id ?? newHabitForm.categoryId ?? 1),
      categoryId: categories[0]?.id ?? newHabitForm.categoryId ?? 1,
      startDate: date
    });
    scrollToHabitForm();
  }

  function startEditHabit(habit: Habit) {
    setEditingHabitId(habit.id);
    setSelectedHabitId(habit.id);
    setNewHabitForm({
      categoryId: habit.categoryId,
      name: habit.name,
      description: habit.description ?? "",
      startDate: habit.startDate,
      endDate: habit.endDate,
      targetValue: habit.targetValue ?? 1,
      unit: habit.unit ?? "раз",
      frequency: habit.frequency,
      isActive: habit.isActive,
      schedules: habit.schedules.length
        ? habit.schedules.map((schedule) => ({
            dayOfWeek: schedule.dayOfWeek,
            timeOfDay: schedule.timeOfDay,
            minTimesPerDay: schedule.minTimesPerDay,
            isEnabled: schedule.isEnabled
          }))
        : [createSchedule()]
    });
    scrollToHabitForm();
  }

  function cancelHabitEditing() {
    setEditingHabitId(null);
    setNewHabitForm(createInitialHabitForm(categories[0]?.id ?? 1));
  }

  const profileName = meQuery.data?.firstName || meQuery.data?.nickname || "Игрок";
  const avatarLabel = getInitials(profileName || "HG");
  const xp = summary?.xp ?? 0;
  const nextLevelXp = summary?.nextLevelXp ?? 120;
  const levelProgress = nextLevelXp > 0 ? clampPercent((xp / nextLevelXp) * 100) : 0;
  const weeklyProgress = summary?.weeklyProgressPercent ?? 0;
  const dailyScore = summary?.dailyScore ?? 0;
  const challengeProgress = challenges.length
    ? clampPercent(
        challenges.reduce((total, challenge) => total + (challenge.completionPercent ?? 0), 0) / challenges.length
      )
    : 0;
  const weeklyPoints = weekOverview.map((day) => day.completionPercent);
  const activeHabitsCount = habits.filter((habit) => habit.isActive).length;
  const coins = (summary?.todayCompletedCount ?? 0) * 18 + (summary?.streakDays ?? 0) * 6;
  const chestReady = dailyScore >= 100;
  const dailyQuestProgress = summary?.todayPlannedCount ? clampPercent((summary.todayCompletedCount / summary.todayPlannedCount) * 100) : 0;
  const topChallenges = [...challenges].sort((left, right) => right.id - left.id).slice(0, 4);
  const normalizedAchievements = useMemo(() => {
    const mapped = achievements.map((achievement) => normalizeAchievement(achievement));
    return mapped.sort((left, right) => {
      if (left.unlocked !== right.unlocked) {
        return left.unlocked ? -1 : 1;
      }
      if (left.unlocked && right.unlocked) {
        const leftTime = left.unlockedAt ? new Date(left.unlockedAt).getTime() : 0;
        const rightTime = right.unlockedAt ? new Date(right.unlockedAt).getTime() : 0;
        return rightTime - leftTime;
      }
      return left.title.localeCompare(right.title, "ru");
    });
  }, [achievements]);
  /** Бейджи в шапке личного кабинета — только последние 3–4 полученных */
  const cabinetAchievementBadges = normalizedAchievements.filter((achievement) => achievement.unlocked).slice(0, 4);
  /** Полка трофеев — полный каталог (полученные + ещё не открытые) */
  const shelfAchievements = normalizedAchievements;
  const highlightedTodayHabits = todayHabits.slice(0, 4);
  const socialPulse = [
    ...cabinetAchievementBadges.slice(0, 2).map((achievement) => ({
      title: achievement.title,
      text: achievement.description,
      tag: "Достижение"
    })),
    ...highlightedTodayHabits.filter((habit) => habit.completedToday).slice(0, 2).map((habit) => ({
      title: habit.name,
      text: `${habit.categoryName} · ${habit.plannedTime?.slice(0, 5) ?? "без времени"}`,
      tag: "Сегодня закрыто"
    }))
  ];
  const streakScore = clampPercent(((summary?.streakDays ?? 0) / 30) * 100);
  const unlockedAchievementCount = normalizedAchievements.filter((a) => a.unlocked).length;
  const achievementProgress = clampPercent(
    normalizedAchievements.length ? (unlockedAchievementCount / normalizedAchievements.length) * 100 : 0
  );
  const weeklyAverage = average(weeklyPoints);
  const consistencyScore = clampPercent(100 - average(weeklyPoints.map((point) => Math.abs(point - weeklyAverage))));
  const healthScore = clampPercent(
    0.35 * weeklyProgress +
    0.25 * streakScore +
    0.2 * challengeProgress +
    0.1 * achievementProgress +
    0.1 * consistencyScore
  );
  const previousWeekProxy = average(weeklyPoints.slice(0, Math.max(1, Math.floor(weeklyPoints.length / 2))));
  const currentWeekProxy = average(weeklyPoints.slice(Math.floor(weeklyPoints.length / 2)));
  const activityDelta = Math.round(currentWeekProxy - previousWeekProxy);
  const weakestDay = weekOverview.reduce(
    (worst, day) => (day.completionPercent < worst.completionPercent ? day : worst),
    weekOverview[0] ?? { date: selectedDate, completionPercent: 0, completedCount: 0, totalCount: 0, habits: [] }
  );
  const strongestDay = weekOverview.reduce(
    (best, day) => (day.completionPercent > best.completionPercent ? day : best),
    weekOverview[0] ?? { date: selectedDate, completionPercent: 0, completedCount: 0, totalCount: 0, habits: [] }
  );
  const missedTodayCount = Math.max((summary?.todayPlannedCount ?? 0) - (summary?.todayCompletedCount ?? 0), 0);
  const streakRiskLabel = missedTodayCount >= 2 ? "Высокий" : missedTodayCount === 1 ? "Средний" : "Низкий";
  const streakRiskTone = missedTodayCount >= 2 ? "high" : missedTodayCount === 1 ? "mid" : "low";
  const healthState =
    healthScore >= 85
      ? "Отличная неделя"
      : healthScore >= 65
        ? "Стабильный прогресс"
        : healthScore >= 45
          ? "Нужен мягкий возврат в ритм"
          : "Риск выгорания";
  const weeklyForecast =
    strongestDay.completionPercent >= 80
      ? `Если удержишь темп ${formatWeekday(strongestDay.date)}, неделя закроется сильнее среднего.`
      : "Неделе нужен один чистый день без пропуска, чтобы снова пойти вверх.";
  const analyticsDays: AnalyticsWeekDay[] = weekOverview.map((day) => ({
    date: day.date,
    completedCount: day.completedCount,
    totalCount: day.totalCount,
    completionPercent: day.completionPercent
  }));
  const analyticsHealthCard: AnalyticsHealthCardData = {
    score: healthScore,
    state: healthState,
    summary:
      activityDelta >= 0
        ? `Ты на ${activityDelta}% активнее, чем в начале недели.`
        : `Темп просел на ${Math.abs(activityDelta)}% — пора вернуть один сильный день.`,
    metrics: [
      { key: "completion", value: weeklyProgress },
      { key: "streak", value: streakScore },
      { key: "challenges", value: challengeProgress },
      { key: "stability", value: consistencyScore }
    ]
  };
  const analyticsSummaryCards: AnalyticsSummaryCardData[] = [
    {
      title: "Серия",
      value: `${summary?.streakDays ?? 0} дня подряд`,
      description: `Личный рекорд держится, пока день не уходит в ноль. Риск потери серии сегодня ${streakRiskLabel.toLowerCase()}.`,
      badge: `Риск: ${streakRiskLabel.toLowerCase()}`,
      tone: streakRiskTone
    },
    {
      title: "Слабое место",
      value: `${formatWeekday(weakestDay.date).toUpperCase()} · ${weakestDay.completionPercent}%`,
      description: "Этот день просел сильнее остальных. Если закрыть его аккуратно, общий ритм недели вырастет быстрее всего."
    },
    {
      title: "Прогноз",
      value: `${formatWeekday(strongestDay.date).toUpperCase()} — опорный день`,
      description: weeklyForecast
    }
  ];
  const analyticsLoading = summaryQuery.isLoading || habitsQuery.isLoading || todayQuery.isLoading;
  const analyticsError = summaryQuery.isError || habitsQuery.isError || todayQuery.isError;
  const analyticsEmpty = !analyticsError && !analyticsLoading && analyticsDays.every((day) => day.totalCount === 0);
  return (
    <section className="product-page dashboard-neo-page">
      {toast ? (
        <div className={`dashboard-neo-toast dashboard-neo-toast-${toast.tone}`}>
          <span>{toast.tone === "success" ? "Готово" : "Нужно внимание"}</span>
          <strong>{toast.text}</strong>
        </div>
      ) : null}

      <article className="dashboard-neo-hero dashboard-neo-hero-soft">
        <div className="dashboard-neo-orb dashboard-neo-orb-left" />
        <div className="dashboard-neo-orb dashboard-neo-orb-right" />

        <div className="dashboard-neo-hero-main">
          <p className="app-kicker dashboard-neo-kicker">Личный кабинет</p>

          <div className="dashboard-neo-profile-row">
            <div className="dashboard-neo-avatar-shell dashboard-neo-avatar-shell-soft">
              {meQuery.data?.avatarUrl ? (
                <img src={meQuery.data.avatarUrl} alt={profileName} className="dashboard-neo-avatar" />
              ) : (
                <div className="dashboard-neo-avatar dashboard-neo-avatar-fallback">{avatarLabel}</div>
              )}
            </div>

            <div className="dashboard-neo-title-wrap">
              <h1>{profileName}, держим мягкий, но устойчивый темп.</h1>
              <p>
                Кабинет собирает уровень, серию, недельную дистанцию и ближайшие задачи в одном месте,
                чтобы прогресс читался быстро и мотивировал продолжать сезон без лишнего шума.
              </p>
            </div>
          </div>

          <div className="dashboard-neo-level-card dashboard-neo-level-card-soft">
            <div className="dashboard-neo-level-head">
              <span>Уровень {summary?.level ?? 1}</span>
              <strong>{xp} XP</strong>
            </div>
            <div className="dashboard-neo-level-bar">
              <div className="dashboard-neo-level-bar-fill dashboard-neo-level-bar-fill-soft" style={{ width: `${levelProgress}%` }} />
            </div>
            <div className="dashboard-neo-level-foot">
              <span>До следующего уровня</span>
              <strong>{Math.max(nextLevelXp - xp, 0)} XP</strong>
            </div>
          </div>

          <div className="dashboard-neo-badges">
            {achievementsQuery.isLoading ? (
              Array.from({ length: 2 }, (_, index) => (
                <div key={`achievement-badge-skeleton-${index}`} className="dashboard-neo-badge achievement-skeleton achievement-skeleton-badge" />
              ))
            ) : achievementsQuery.isError ? (
              <div className="dashboard-neo-badge achievement-state-card is-error">
                <div className="achievement-state-copy">
                  <strong>Не удалось загрузить достижения</strong>
                  <span>Попробуйте обновить страницу.</span>
                </div>
              </div>
            ) : cabinetAchievementBadges.length ? (
              cabinetAchievementBadges.map((achievement) => (
                <div key={achievement.id} className={`dashboard-neo-badge rarity-${achievement.rarity} achievement-tone-${achievement.tone}`}>
                  <AchievementIcon
                    icon={achievement.iconKey}
                    rarity={achievement.rarity}
                    unlocked={achievement.unlocked}
                    size="sm"
                  />
                  <div className="dashboard-neo-badge-copy">
                    <strong>{achievement.title}</strong>
                    <span>{achievement.rarityLabel}</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="dashboard-neo-badge achievement-state-card">
                <div className="achievement-state-copy">
                  <strong>Пока нет достижений</strong>
                  <span>Выполняйте привычки, участвуйте в челленджах и открывайте новые награды.</span>
                </div>
              </div>
            )}
          </div>
        </div>
        <div className="dashboard-neo-hero-side">
          <div className="dashboard-neo-stat-grid">
            <article className="dashboard-neo-stat-card glass-card dashboard-neo-surface-soft">
              <span>Индекс дня</span>
              <strong>{dailyScore}%</strong>
              <p>{summary?.todayCompletedCount ?? 0} из {summary?.todayPlannedCount ?? 0} привычек закрыто сегодня</p>
            </article>
            <article className="dashboard-neo-stat-card glass-card dashboard-neo-surface-soft">
              <span>Серия</span>
              <strong className="dashboard-neo-streak-value"><span className="dashboard-neo-flame">✦</span>{summary?.streakDays ?? 0}</strong>
              <p>Серия без пропусков держит сезон в тонусе</p>
            </article>
            <article className="dashboard-neo-stat-card glass-card dashboard-neo-surface-soft">
              <span>Активные челленджи</span>
              <strong>{summary?.activeChallengesCount ?? 0}</strong>
              <p>Сейчас в игре {summary?.activeChallengesCount ?? 0} челленджей</p>
            </article>
            <article className="dashboard-neo-stat-card glass-card dashboard-neo-surface-soft">
              <span>Награды</span>
              <strong>{coins}</strong>
              <p>{chestReady ? "Сундук дня открыт" : "К сундуку ведет чистое закрытие плана"}</p>
            </article>
          </div>

          <article className="dashboard-neo-quest glass-card dashboard-neo-surface-soft">
            <div className="dashboard-neo-quest-topline">
              <span>Задание дня</span>
              <strong>{dailyQuestProgress}%</strong>
            </div>
            <h2>{firstPendingTodayHabit ? `Закрыть «${firstPendingTodayHabit.name}»` : "План на сегодня уже закрыт"}</h2>
            <p>{summary?.insight ?? "Лучший рост приходит через небольшой, но чистый шаг."}</p>
            <div className="dashboard-neo-quest-bar">
              <div className="dashboard-neo-quest-bar-fill dashboard-neo-level-bar-fill-soft" style={{ width: `${dailyQuestProgress}%` }} />
            </div>
            <div className="dashboard-neo-quick-actions">
              <button
                type="button"
                className="dashboard-neo-primary-button dashboard-neo-primary-button-soft"
                disabled={!firstPendingTodayHabit || checkInMutation.isPending}
                onClick={() =>
                  firstPendingTodayHabit &&
                  checkInMutation.mutate({
                    habitId: firstPendingTodayHabit.id,
                    date: firstPendingTodayHabit.date,
                    value: firstPendingTodayHabit.targetValue ?? 1
                  })
                }
              >
                {checkInMutation.isPending ? "Сохраняем ритм..." : "Отметить привычку"}
              </button>
              <button type="button" className="dashboard-neo-secondary-button dashboard-neo-secondary-button-soft" onClick={() => navigate("/challenges")}>Принять челлендж</button>
              <button type="button" className="dashboard-neo-secondary-button dashboard-neo-secondary-button-soft" onClick={() => document.getElementById("create-habit-form")?.scrollIntoView({ behavior: "smooth" })}>Создать привычку</button>
            </div>
          </article>
        </div>
      </article>

      <section className="dashboard-neo-primary-sections">
        <div className="dashboard-neo-feature-stack">
          <article className="dashboard-neo-panel dashboard-neo-week-section glass-card dashboard-neo-surface-soft">
            <div className="dashboard-panel-head">
              <div>
                <p className="app-kicker dashboard-neo-kicker">Календарь недели</p>
                <h2>Игровая сетка на ближайшие семь дней</h2>
              </div>
              <span className="dashboard-chip dashboard-chip-soft">{summary?.todayCompletedCount ?? 0}/{summary?.todayPlannedCount ?? 0} сегодня</span>
            </div>

            <div className="dashboard-neo-week-grid dashboard-neo-week-grid-board">
              {weekOverview.map((day) => {
                const isExpanded = expandedDays.includes(day.date);
                const visibleHabits = isExpanded ? day.habits : day.habits.slice(0, 2);

                return (
                  <div key={day.date} className={`dashboard-neo-day-card dashboard-neo-day-card-board ${selectedDate === day.date ? "is-selected" : ""} ${day.completionPercent >= 100 && day.totalCount ? "is-complete" : ""}`}>
                    <button type="button" className="dashboard-neo-day-head" onClick={() => setSelectedDate(day.date)}>
                      <div><span>{formatWeekday(day.date)}</span><strong>{formatDayLabel(day.date)}</strong></div>
                      <small>{day.completionPercent}%</small>
                    </button>
                    <div className="dashboard-neo-day-meter"><div className="dashboard-neo-day-meter-fill dashboard-neo-level-bar-fill-soft" style={{ width: `${day.completionPercent}%` }} /></div>
                    <div className="dashboard-neo-day-aura"><span className="dashboard-neo-day-badge">{day.totalCount || 0} задач</span></div>
                    <div className="dashboard-neo-day-list">
                      {visibleHabits.length ? (
                        visibleHabits.map(({ habit, day: timelineDay }) => (
                          <button
                            key={`${day.date}-${habit.id}`}
                            type="button"
                            className={`dashboard-neo-habit-chip dashboard-neo-habit-chip-soft ${selectedHabitId === habit.id && selectedDate === day.date ? "is-active" : ""} ${timelineDay.completed ? "is-done" : ""}`}
                            onClick={() => {
                              setSelectedHabitId(habit.id);
                              setSelectedDate(day.date);
                            }}
                          >
                            <strong>{habit.name}</strong>
                            <span>{timelineDay.completed ? "закрыто" : "в плане"}</span>
                          </button>
                        ))
                      ) : (
                        <div className="dashboard-neo-empty-slot">Лёгкий день без задач</div>
                      )}
                      {day.habits.length > 2 ? (
                        <button type="button" className="dashboard-neo-more dashboard-neo-more-button" onClick={() => toggleExpandedDay(day.date)}>
                          {isExpanded ? "свернуть" : `+${day.habits.length - 2} ещё`}
                        </button>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>

            {selectedDayOverview ? (
              <div className="dashboard-neo-day-detail dashboard-neo-surface-muted">
                <div className="dashboard-neo-day-detail-head">
                  <div>
                    <span className="dashboard-neo-day-detail-kicker">{formatWeekday(selectedDayOverview.date)}</span>
                    <h3>{formatDayLabel(selectedDayOverview.date)} · {selectedDayOverview.completedCount}/{selectedDayOverview.totalCount || 0} закрыто</h3>
                    <p>В этой панели видно все привычки дня. Отсюда удобно быстро отметить результат, поправить план и добавить новую привычку.</p>
                  </div>
                  <button type="button" className="dashboard-neo-link-button dashboard-neo-secondary-button-soft" onClick={() => startCreateHabitForDate(selectedDayOverview.date)}>
                    Добавить привычку
                  </button>
                </div>

                <div className="dashboard-neo-day-detail-list">
                  {selectedDayOverview.habits.length ? (
                    selectedDayOverview.habits.map(({ habit, day }) => (
                      <article key={`${selectedDayOverview.date}-${habit.id}-detail`} className={`dashboard-neo-day-detail-item ${day.completed ? "is-done" : ""}`}>
                        <div className="dashboard-neo-day-detail-main">
                          <div className="dashboard-neo-day-detail-title">
                            <strong>{habit.name}</strong>
                            <span>{habit.categoryName}</span>
                          </div>
                          <div className="dashboard-neo-day-detail-meta">
                            <span>{formatTarget(habit.targetValue, habit.unit)}</span>
                            <span>{habit.schedules[0]?.timeOfDay?.slice(0, 5) ?? "без времени"}</span>
                            <span>{day.completed ? "Закрыто" : "В плане"}</span>
                          </div>
                        </div>
                        <div className="dashboard-neo-day-detail-actions">
                          <button
                            type="button"
                            className="dashboard-neo-mini-toggle dashboard-neo-secondary-button-soft"
                            onClick={() => startEditHabit(habit)}
                          >
                            Редактировать
                          </button>
                          <button
                            type="button"
                            className={`dashboard-neo-mini-toggle dashboard-neo-secondary-button-soft ${day.completed ? "is-done" : ""}`}
                            disabled={day.completed || checkInMutation.isPending}
                            onClick={() =>
                              checkInMutation.mutate({
                                habitId: habit.id,
                                date: selectedDayOverview.date,
                                value: habit.targetValue ?? 1
                              })
                            }
                          >
                            {day.completed ? "Закрыто" : "Отметить"}
                          </button>
                        </div>
                      </article>
                    ))
                  ) : (
                    <div className="dashboard-neo-day-detail-empty">
                      <strong>На выбранный день пока нет привычек.</strong>
                      <p>Можно сразу добавить первую привычку и превратить день в аккуратную рабочую ячейку.</p>
                    </div>
                  )}
                </div>
              </div>
            ) : null}
          </article>

          <AnalyticsSection
            seasonHabitCount={activeHabitsCount}
            healthCard={analyticsHealthCard}
            summaryCards={analyticsSummaryCards}
            days={analyticsDays}
            weeklyClosedCount={summary?.weeklyCompletedCount ?? 0}
            isLoading={analyticsLoading}
            isError={analyticsError}
            isEmpty={analyticsEmpty}
            onSelectDay={setSelectedDate}
          />

          <article className="dashboard-neo-panel dashboard-neo-focus-section glass-card dashboard-neo-surface-soft">
            <div className="dashboard-panel-head">
              <div>
                <p className="app-kicker dashboard-neo-kicker">Фокус привычки</p>
                <h2>{selectedHabit?.name ?? "Выберите привычку в календаре"}</h2>
              </div>
              <span className="dashboard-chip dashboard-chip-soft">{selectedHabit ? formatDayLabel(selectedDate) : "нет выбора"}</span>
            </div>

            {selectedHabit ? (
              <div className="dashboard-neo-focus-grid">
                <div className="dashboard-neo-focus-card dashboard-neo-surface-muted">
                  <div className="dashboard-neo-focus-facts">
                    <div><span>Категория</span><strong>{selectedHabit.categoryName}</strong></div>
                    <div><span>Цель</span><strong>{formatTarget(selectedHabit.targetValue, selectedHabit.unit)}</strong></div>
                    <div><span>Статус дня</span><strong>{selectedDayEntry?.completed ? "Выполнено" : "Запланировано"}</strong></div>
                    <div><span>Время</span><strong>{selectedHabit.schedules[0]?.timeOfDay?.slice(0, 5) ?? "без времени"}</strong></div>
                  </div>

                  <div className="dashboard-neo-focus-actions">
                    <button
                      type="button"
                      className={`dashboard-neo-complete-button dashboard-neo-primary-button-soft ${selectedDayEntry?.completed ? "is-done" : ""}`}
                      disabled={Boolean(selectedDayEntry?.completed) || checkInMutation.isPending}
                      onClick={() =>
                        checkInMutation.mutate({
                          habitId: selectedHabit.id,
                          date: selectedDate,
                          value: selectedHabit.targetValue ?? 1
                        })
                      }
                    >
                      <span className="dashboard-neo-complete-mark">✓</span>
                      <span>{selectedDayEntry?.completed ? "Уже закрыто" : checkInMutation.isPending ? "Фиксируем результат..." : "Отметить выполненной"}</span>
                    </button>
                  </div>
                </div>

                <div className="dashboard-neo-radar-card dashboard-neo-surface-muted">
                  <div className="dashboard-neo-mini-head"><strong>Быстрый радар дня</strong><span>{highlightedTodayHabits.length} карточки</span></div>
                  <div className="dashboard-neo-radar-list">
                    {highlightedTodayHabits.length ? (
                      highlightedTodayHabits.map((habit) => (
                        <div key={`${habit.id}-${habit.date}`} className="dashboard-neo-radar-item">
                          <div>
                            <strong>{habit.name}</strong>
                            <p>{habit.categoryName} · {habit.plannedTime?.slice(0, 5) ?? "без времени"}</p>
                          </div>
                          <button
                            type="button"
                            className={`dashboard-neo-mini-toggle dashboard-neo-secondary-button-soft ${habit.completedToday ? "is-done" : ""}`}
                            disabled={habit.completedToday || checkInMutation.isPending}
                            onClick={() =>
                              checkInMutation.mutate({
                                habitId: habit.id,
                                date: habit.date,
                                value: habit.targetValue ?? 1
                              })
                            }
                          >
                            {habit.completedToday ? "Закрыто" : "Выполнить"}
                          </button>
                        </div>
                      ))
                    ) : (
                      <p className="dashboard-neo-empty-copy">На сегодня пока нет запланированных привычек.</p>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <p className="dashboard-neo-empty-copy">Нажмите на карточку дня выше, чтобы открыть привычку и отметить её одним кликом.</p>
            )}
          </article>

          <article className="dashboard-neo-panel dashboard-neo-challenge-section glass-card dashboard-neo-surface-soft">
            <div className="dashboard-panel-head">
              <div>
                <p className="app-kicker dashboard-neo-kicker">Челленджи</p>
                <h2>Четыре последних челленджа сезона</h2>
              </div>
              <button type="button" className="dashboard-neo-link-button dashboard-neo-secondary-button-soft" onClick={() => navigate("/challenges")}>Смотреть больше</button>
            </div>
            <div className="dashboard-neo-challenge-rail">
              {topChallenges.length ? (
                topChallenges.map((challenge) => (
                  <div key={challenge.id} className="dashboard-neo-challenge-card dashboard-neo-challenge-card-wide">
                    {challenge.coverImageUrl ? <img src={challenge.coverImageUrl} alt={challenge.name} className="dashboard-neo-challenge-cover dashboard-neo-challenge-cover-wide" /> : null}
                    <div className="dashboard-neo-challenge-copy">
                      <strong>{challenge.name}</strong>
                      <p>{challenge.description || "Челлендж уже ждёт ваш темп и следующий сильный шаг."}</p>
                      <div className="dashboard-neo-challenge-foot"><span>{challenge.participantCount ?? 0} участников</span><span>{challenge.completionPercent ?? 0}% прогресса</span></div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="dashboard-neo-empty-copy">Подключите первый челлендж, чтобы сезон стал соревнованием, а не просто списком задач.</p>
              )}
            </div>
          </article>
        </div>
      </section>

      <section className="dashboard-neo-secondary-sections">
        <div className="dashboard-neo-support-form">
          <article className="dashboard-neo-panel glass-card dashboard-neo-surface-soft" id="create-habit-form">
            <div className="dashboard-panel-head">
              <div>
                <p className="app-kicker dashboard-neo-kicker">Новая привычка</p>
                <h2>{editingHabitId ? "Редактирование привычки" : "Добавить цель в сезонный план"}</h2>
              </div>
            </div>

            <form className="dashboard-neo-form" onSubmit={submitNewHabit}>
              <label className="app-field">
                <span>Категория</span>
                <select className="app-select" value={newHabitForm.categoryId} onChange={(event) => setNewHabitForm((current) => ({ ...current, categoryId: Number(event.target.value) }))}>
                  {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
                </select>
              </label>
              <label className="app-field"><span>Название</span><input value={newHabitForm.name} onChange={(event) => setNewHabitForm((current) => ({ ...current, name: event.target.value }))} required /></label>
              <label className="app-field dashboard-neo-form-wide"><span>Описание</span><input value={newHabitForm.description} onChange={(event) => setNewHabitForm((current) => ({ ...current, description: event.target.value }))} /></label>
              <label className="app-field"><span>Цель</span><input type="number" min={1} value={newHabitForm.targetValue} onChange={(event) => setNewHabitForm((current) => ({ ...current, targetValue: Number(event.target.value) || 1 }))} /></label>
              <label className="app-field"><span>Единица</span><input value={newHabitForm.unit} onChange={(event) => setNewHabitForm((current) => ({ ...current, unit: event.target.value }))} /></label>
              <label className="app-field"><span>Дата начала</span><input type="date" value={newHabitForm.startDate} onChange={(event) => setNewHabitForm((current) => ({ ...current, startDate: event.target.value }))} required /></label>
              <label className="app-field"><span>Дата окончания</span><input type="date" value={newHabitForm.endDate ?? ""} onChange={(event) => setNewHabitForm((current) => ({ ...current, endDate: event.target.value || null }))} /></label>
              <label className="app-field dashboard-neo-form-wide"><span>Время</span><input type="time" value={(newHabitForm.schedules[0]?.timeOfDay ?? "09:00:00").slice(0, 5)} onChange={(event) => setNewHabitForm((current) => ({ ...current, schedules: [{ ...(current.schedules[0] ?? createSchedule()), timeOfDay: `${event.target.value}:00` }] }))} /></label>
              <div className="dashboard-neo-form-actions dashboard-neo-form-wide">
                <button
                  className="dashboard-neo-primary-button dashboard-neo-primary-button-soft"
                  type="submit"
                  disabled={createHabitMutation.isPending || updateHabitMutation.isPending}
                >
                  {editingHabitId
                    ? updateHabitMutation.isPending
                      ? "Сохраняем изменения..."
                      : "Сохранить привычку"
                    : createHabitMutation.isPending
                      ? "Добавляем привычку..."
                      : "Создать привычку"}
                </button>
                {editingHabitId ? (
                  <button type="button" className="dashboard-neo-link-button dashboard-neo-secondary-button-soft" onClick={cancelHabitEditing}>
                    Отменить редактирование
                  </button>
                ) : null}
              </div>
              {createHabitMutation.isError ? <p className="app-feedback app-feedback-error dashboard-neo-form-wide">{getApiErrorMessage(createHabitMutation.error, "Не удалось создать привычку.")}</p> : null}
              {updateHabitMutation.isError ? <p className="app-feedback app-feedback-error dashboard-neo-form-wide">{getApiErrorMessage(updateHabitMutation.error, "Не удалось обновить привычку.")}</p> : null}
            </form>
          </article>
        </div>

        <div className="dashboard-neo-support-cards">
          <article className="dashboard-neo-panel glass-card dashboard-neo-surface-soft dashboard-neo-achievement-panel">
            <div className="dashboard-panel-head">
              <div>
                <p className="app-kicker dashboard-neo-kicker">Достижения</p>
                <h2>Полка трофеев сезона</h2>
              </div>
            </div>
            <div className="dashboard-neo-achievement-showcase">
              {achievementsQuery.isLoading ? (
                Array.from({ length: 2 }, (_, index) => (
                  <div key={`achievement-card-skeleton-${index}`} className="achievement-skeleton achievement-skeleton-card" />
                ))
              ) : achievementsQuery.isError ? (
                <div className="dashboard-neo-achievement-card achievement-state-card is-error">
                  <div className="achievement-state-copy">
                    <strong>Не удалось загрузить достижения</strong>
                    <p>Попробуйте обновить страницу.</p>
                  </div>
                </div>
              ) : shelfAchievements.length ? (
                shelfAchievements.map((achievement) => (
                  <AchievementCard key={achievement.id} achievement={achievement} accentClassName="dashboard-neo-achievement-card" />
                ))
              ) : (
                <div className="dashboard-neo-achievement-card achievement-state-card">
                  <div className="achievement-state-copy">
                    <strong>Пока нет достижений</strong>
                    <p>Выполняйте привычки, участвуйте в челленджах и открывайте новые награды.</p>
                  </div>
                </div>
              )}
            </div>
          </article>

          <article className="dashboard-neo-panel glass-card dashboard-neo-surface-soft dashboard-neo-reward-panel">
            <div className="dashboard-panel-head">
              <div>
                <p className="app-kicker dashboard-neo-kicker">Награды</p>
                <h2>Сейф сезона</h2>
              </div>
            </div>
            <div className="dashboard-neo-reward-grid">
              <div className="dashboard-neo-reward-card is-coins"><span>Монеты</span><strong>{coins}</strong><p>Монеты за чистые закрытия и серию без пропусков</p></div>
              <div className="dashboard-neo-reward-card is-xp"><span>Опыт сезона</span><strong>+{Math.max(10, (summary?.streakDays ?? 0) * 5)}</strong><p>Бонус растёт вместе со стабильной серией</p></div>
              <div className={`dashboard-neo-reward-card is-chest ${chestReady ? "is-open" : ""}`}><span>Сундук дня</span><strong>{chestReady ? "Открыт" : "Ждёт 100%"}</strong><p>{chestReady ? "Сегодня вы закрыли план без потерь." : "Закройте все привычки дня, чтобы открыть награду."}</p></div>
            </div>
          </article>
        </div>
      </section>
    </section>
  );
}
