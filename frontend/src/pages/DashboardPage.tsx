import { FormEvent, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  checkInHabit,
  createChallenge,
  createHabit,
  deleteHabit,
  getAchievements,
  getChallenge,
  getCurrentUser,
  getHabitCategories,
  getHabitTimeline,
  getHabits,
  getMyChallenges,
  getTodayHabits,
  leaveChallenge,
  updateHabit,
  type ChallengeCreatePayload,
  type HabitPayload
} from "../lib/api";
import { getApiErrorMessage } from "../lib/errors";
import { useAuthStore } from "../lib/auth";
import type { ChallengeTarget, Habit, HabitCategory, HabitTimelineDay } from "../lib/types";

const FALLBACK_CATEGORIES: HabitCategory[] = [
  { id: 1, name: "Вода" },
  { id: 2, name: "Активность" },
  { id: 3, name: "Сон" },
  { id: 4, name: "Питание" },
  { id: 5, name: "Фокус" }
];

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

function formatWeekday(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("ru-RU", { weekday: "short" });
}

function formatDayNumber(value: string) {
  return value.slice(8, 10);
}

function formatMonthNumber(value: string) {
  return value.slice(5, 7);
}

function formatTarget(targetValue: number | null, unit: string | null) {
  if (targetValue == null && !unit) return "Без числовой цели";
  if (targetValue == null) return unit ?? "";
  return `${targetValue} ${unit ?? ""}`.trim();
}

function formatPlannedTime(value: string | null) {
  return value ? value.slice(0, 5) : "Без времени";
}

function formatAchievementDate(value: string) {
  return new Date(value).toLocaleDateString("ru-RU", { day: "2-digit", month: "short" });
}

function matchesTarget(habit: Habit, target: ChallengeTarget) {
  switch (target.targetKind) {
    case "HABIT":
      return target.habitId === habit.id;
    case "CATEGORY":
      return target.categoryId === habit.categoryId;
    case "UNIT":
      return Boolean(target.unit && habit.unit && target.unit.toLowerCase() === habit.unit.toLowerCase());
    default:
      return false;
  }
}

function describeChallengeRule(target: ChallengeTarget) {
  switch (target.targetKind) {
    case "CATEGORY":
      return `В зачет идут привычки из категории «${target.categoryName ?? "без названия"}».`;
    case "HABIT":
      return `В зачет идет конкретная привычка #${target.habitId}.`;
    case "UNIT":
      return `В зачет идут привычки с единицей измерения ${target.unit ?? "не указана"}.`;
    default:
      return "Правило челленджа задано в системе.";
  }
}

function createInitialHabitForm(): HabitPayload {
  return {
    categoryId: 1,
    name: "",
    description: "",
    startDate: todayIsoDate(),
    endDate: addDaysIso(6),
    targetValue: 1,
    unit: "раз",
    frequency: "DAILY",
    isActive: true,
    schedules: [{ dayOfWeek: null, timeOfDay: "09:00:00", minTimesPerDay: 1, isEnabled: true }]
  };
}

function createInitialChallengeForm(): ChallengeCreatePayload {
  return {
    name: "",
    description: "",
    startDate: todayIsoDate(),
    endDate: addDaysIso(6),
    goalType: "SUM_VALUE",
    goalValue: 7,
    isPublic: true,
    coverImageUrl: "",
    targets: [{ targetKind: "CATEGORY", categoryId: 1 }]
  };
}

export function DashboardPage() {
  const qc = useQueryClient();
  const accessToken = useAuthStore((state) => state.accessToken);
  const [selectedHabitId, setSelectedHabitId] = useState<number | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(todayIsoDate());
  const [habitForm, setHabitForm] = useState<HabitPayload>(createInitialHabitForm());
  const [newHabitForm, setNewHabitForm] = useState<HabitPayload>(createInitialHabitForm());
  const [challengeForm, setChallengeForm] = useState<ChallengeCreatePayload>(createInitialChallengeForm());
  const [selectedChallengeId, setSelectedChallengeId] = useState<number | null>(null);
  const [timelineByHabit, setTimelineByHabit] = useState<Record<number, HabitTimelineDay[]>>({});

  const meQuery = useQuery({ queryKey: ["me"], queryFn: getCurrentUser, enabled: Boolean(accessToken) });
  const habitsQuery = useQuery({ queryKey: ["habits"], queryFn: getHabits, enabled: Boolean(accessToken) });
  const todayQuery = useQuery({ queryKey: ["today-habits"], queryFn: getTodayHabits, enabled: Boolean(accessToken) });
  const myChallengesQuery = useQuery({ queryKey: ["my-challenges"], queryFn: getMyChallenges, enabled: Boolean(accessToken) });
  const achievementsQuery = useQuery({ queryKey: ["achievements"], queryFn: getAchievements, enabled: Boolean(accessToken) });
  const categoriesQuery = useQuery({ queryKey: ["habit-categories"], queryFn: getHabitCategories, enabled: Boolean(accessToken) });
  const challengeDetailsQuery = useQuery({
    queryKey: ["challenge-details", selectedChallengeId],
    queryFn: () => getChallenge(selectedChallengeId!),
    enabled: Boolean(accessToken && selectedChallengeId)
  });

  const categoryOptions = categoriesQuery.data?.length ? categoriesQuery.data : FALLBACK_CATEGORIES;

  useEffect(() => {
    if (!habitsQuery.data?.content.length) {
      setTimelineByHabit({});
      return;
    }

    let cancelled = false;

    (async () => {
      const entries = await Promise.all(
        habitsQuery.data!.content.map(async (habit) => ({
          habitId: habit.id,
          timeline: await getHabitTimeline(habit.id, 7)
        }))
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
  }, [habitsQuery.data]);

  useEffect(() => {
    if (!selectedChallengeId && myChallengesQuery.data?.content.length) {
      setSelectedChallengeId(myChallengesQuery.data.content[0].id);
    }
  }, [myChallengesQuery.data, selectedChallengeId]);

  const habits = habitsQuery.data?.content ?? [];
  const weekDates = useMemo(() => buildWeekDates(), []);
  const selectedHabit = useMemo(() => habits.find((habit) => habit.id === selectedHabitId) ?? null, [habits, selectedHabitId]);
  const selectedDayEntry = useMemo(() => timelineByHabit[selectedHabitId ?? -1]?.find((day) => day.date === selectedDate) ?? null, [timelineByHabit, selectedHabitId, selectedDate]);

  useEffect(() => {
    if (!selectedHabit && habits.length) {
      setSelectedHabitId(habits[0].id);
    }
  }, [habits, selectedHabit]);

  useEffect(() => {
    if (!selectedHabit) return;
    setHabitForm({
      categoryId: selectedHabit.categoryId,
      name: selectedHabit.name,
      description: selectedHabit.description ?? "",
      startDate: selectedHabit.startDate,
      endDate: selectedHabit.endDate,
      targetValue: selectedHabit.targetValue ?? 1,
      unit: selectedHabit.unit ?? "раз",
      frequency: selectedHabit.frequency,
      isActive: selectedHabit.isActive,
      schedules: selectedHabit.schedules.length
        ? selectedHabit.schedules.map((schedule) => ({
            dayOfWeek: schedule.dayOfWeek,
            timeOfDay: schedule.timeOfDay,
            minTimesPerDay: schedule.minTimesPerDay,
            isEnabled: schedule.isEnabled
          }))
        : [{ dayOfWeek: null, timeOfDay: "09:00:00", minTimesPerDay: 1, isEnabled: true }]
    });
  }, [selectedHabit]);

  const refreshAll = async () => {
    await Promise.all([
      qc.invalidateQueries({ queryKey: ["me"] }),
      qc.invalidateQueries({ queryKey: ["habits"] }),
      qc.invalidateQueries({ queryKey: ["today-habits"] }),
      qc.invalidateQueries({ queryKey: ["my-challenges"] }),
      qc.invalidateQueries({ queryKey: ["challenge-details"] }),
      qc.invalidateQueries({ queryKey: ["achievements"] })
    ]);
  };

  const createHabitMutation = useMutation({
    mutationFn: createHabit,
    onSuccess: async (habit) => {
      setNewHabitForm(createInitialHabitForm());
      setSelectedHabitId(habit.id);
      await refreshAll();
    }
  });

  const updateHabitMutation = useMutation({
    mutationFn: ({ habitId, payload }: { habitId: number; payload: HabitPayload }) => updateHabit(habitId, payload),
    onSuccess: refreshAll
  });

  const deleteHabitMutation = useMutation({
    mutationFn: deleteHabit,
    onSuccess: async () => {
      setSelectedHabitId(null);
      await refreshAll();
    }
  });

  const checkInMutation = useMutation({
    mutationFn: ({ habitId, date, value, comment }: { habitId: number; date: string; value: number; comment: string }) =>
      checkInHabit(habitId, { checkinDate: date, value, comment, source: "manual" }),
    onSuccess: refreshAll
  });

  const createChallengeMutation = useMutation({
    mutationFn: createChallenge,
    onSuccess: async (challenge) => {
      setChallengeForm(createInitialChallengeForm());
      setSelectedChallengeId(challenge.id);
      await refreshAll();
    }
  });

  const leaveChallengeMutation = useMutation({
    mutationFn: leaveChallenge,
    onSuccess: async () => {
      setSelectedChallengeId(null);
      await refreshAll();
    }
  });

  const selectedChallengeHabits = useMemo(() => {
    if (!challengeDetailsQuery.data) return [] as Habit[];
    return habits.filter((habit) => challengeDetailsQuery.data!.targets.some((target) => matchesTarget(habit, target)));
  }, [challengeDetailsQuery.data, habits]);

  const weekOverview = useMemo(() => {
    return weekDates.map((date) => {
      const habitsForDate = habits
        .map((habit) => {
          const day = timelineByHabit[habit.id]?.find((item) => item.date === date);
          if (!day || !day.scheduled) return null;
          return { habit, day };
        })
        .filter((item): item is { habit: Habit; day: HabitTimelineDay } => Boolean(item));

      return {
        date,
        habits: habitsForDate,
        completedCount: habitsForDate.filter((item) => item.day.completed).length
      };
    });
  }, [habits, timelineByHabit, weekDates]);

  const completedTodayCount = todayQuery.data?.filter((item) => item.completedToday).length ?? 0;
  const todayPlannedCount = todayQuery.data?.length ?? 0;
  const dayCompletionPercent = todayPlannedCount ? Math.round((completedTodayCount / todayPlannedCount) * 100) : 0;

  function submitHabitUpdate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedHabit) return;
    updateHabitMutation.mutate({ habitId: selectedHabit.id, payload: habitForm });
  }

  function submitNewHabit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    createHabitMutation.mutate(newHabitForm);
  }

  function submitChallenge(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    createChallengeMutation.mutate(challengeForm);
  }

  return (
    <section className="product-page dashboard-clean-page">
      <article className="dashboard-clean-hero app-card-contrast">
        <div>
          <p className="app-kicker">Личный кабинет</p>
          <h1>{`${meQuery.data?.firstName || meQuery.data?.nickname || "Пользователь"}, сегодня держим фокус на понятном плане и устойчивом темпе.`}</h1>
          <p>
            Здесь собраны привычки на ближайшую неделю, быстрые действия на сегодня и рабочая зона для обновления уже созданных сценариев.
          </p>
        </div>
        <div className="dashboard-clean-stats">
          <div className="home-stat-card"><span>Активные привычки</span><strong>{habits.length}</strong></div>
          <div className="home-stat-card"><span>Выполнено сегодня</span><strong>{completedTodayCount}</strong></div>
          <div className="home-stat-card"><span>Выполнение плана</span><strong>{dayCompletionPercent}%</strong></div>
          <div className="home-stat-card home-stat-card-wide"><span>Достижения</span><strong>{achievementsQuery.data?.length ?? 0}</strong></div>
        </div>
      </article>

      <article className="app-card dashboard-clean-calendar-card">
        <div className="card-head-inline">
          <div>
            <p className="app-kicker">Календарь недели</p>
            <h2>Ближайшие семь дней без визуального шума</h2>
          </div>
        </div>

        <div className="tracker-week-grid">
          {weekOverview.map((dayBlock) => (
            <button
              key={dayBlock.date}
              type="button"
              className={selectedDate === dayBlock.date ? "tracker-day-card tracker-day-card-active" : "tracker-day-card"}
              onClick={() => setSelectedDate(dayBlock.date)}
            >
              <div className="tracker-day-head">
                <span>{formatWeekday(dayBlock.date)}</span>
                <strong>{formatDayNumber(dayBlock.date)}.{formatMonthNumber(dayBlock.date)}</strong>
              </div>
              <div className="tracker-day-meta">{dayBlock.completedCount}/{dayBlock.habits.length || 0} выполнено</div>
              <div className="tracker-day-habits">
                {dayBlock.habits.length ? dayBlock.habits.map(({ habit, day }) => (
                  <div
                    key={`${dayBlock.date}-${habit.id}`}
                    className={day.completed ? "tracker-habit-chip tracker-habit-chip-complete" : "tracker-habit-chip"}
                    onClick={(event) => {
                      event.stopPropagation();
                      setSelectedHabitId(habit.id);
                      setSelectedDate(dayBlock.date);
                    }}
                  >
                    <span>{habit.name}</span>
                    <small>{day.completed ? "выполнено" : formatTarget(habit.targetValue, habit.unit)}</small>
                  </div>
                )) : <p className="empty-copy">Свободный день</p>}
              </div>
            </button>
          ))}
        </div>
      </article>

      <div className="dashboard-clean-layout">
        <div className="dashboard-clean-main">
          <article className="app-card dashboard-editor-card">
            <div className="card-head card-head-spread">
              <div>
                <p className="app-kicker">Рабочая зона привычки</p>
                <h2>{selectedHabit ? selectedHabit.name : "Выберите привычку в календаре"}</h2>
                <p className="empty-copy">
                  {selectedHabit
                    ? `Дата фокуса: ${selectedDate}. Здесь можно обновить параметры привычки и отметить выполнение на выбранный день.`
                    : "Сначала выберите привычку из календаря недели."}
                </p>
              </div>
            </div>

            {selectedHabit ? (
              <>
                <div className="habit-focus-summary">
                  <div className="home-stat-card"><span>Категория</span><strong>{selectedHabit.categoryName}</strong></div>
                  <div className="home-stat-card"><span>Цель</span><strong>{formatTarget(selectedHabit.targetValue, selectedHabit.unit)}</strong></div>
                  <div className="home-stat-card"><span>Статус дня</span><strong>{selectedDayEntry?.completed ? "Выполнено" : selectedDayEntry?.scheduled ? "Запланировано" : "Не запланировано"}</strong></div>
                  <div className="home-stat-card home-stat-card-wide"><span>Время</span><strong>{formatPlannedTime(selectedHabit.schedules[0]?.timeOfDay ?? null)}</strong></div>
                </div>

                <div className="habit-action-bar">
                  <button
                    type="button"
                    className="app-primary-button"
                    disabled={!selectedDayEntry?.scheduled || Boolean(selectedDayEntry?.completed) || checkInMutation.isPending}
                    onClick={() => checkInMutation.mutate({
                      habitId: selectedHabit.id,
                      date: selectedDate,
                      value: selectedHabit.targetValue ?? 1,
                      comment: `Выполнение привычки ${selectedHabit.name}`
                    })}
                  >
                    {selectedDayEntry?.completed ? "Уже выполнено" : checkInMutation.isPending ? "Отмечаем..." : "Отметить выполнение"}
                  </button>
                  <button
                    type="button"
                    className="app-secondary-button"
                    onClick={() => deleteHabitMutation.mutate(selectedHabit.id)}
                    disabled={deleteHabitMutation.isPending}
                  >
                    {deleteHabitMutation.isPending ? "Удаляем..." : "Удалить привычку"}
                  </button>
                </div>

                {checkInMutation.isError ? <p className="app-feedback app-feedback-error">{getApiErrorMessage(checkInMutation.error, "Не удалось отметить выполнение привычки.")}</p> : null}
                {deleteHabitMutation.isError ? <p className="app-feedback app-feedback-error">{getApiErrorMessage(deleteHabitMutation.error, "Не удалось удалить привычку.")}</p> : null}
                {updateHabitMutation.isError ? <p className="app-feedback app-feedback-error">{getApiErrorMessage(updateHabitMutation.error, "Не удалось сохранить изменения привычки.")}</p> : null}
                {updateHabitMutation.isSuccess ? <p className="app-feedback app-feedback-success">Изменения привычки сохранены.</p> : null}

                <form className="app-form auth-form-grid-2" onSubmit={submitHabitUpdate}>
                  <label className="app-field">
                    <span>Категория</span>
                    <select className="app-select" value={habitForm.categoryId} onChange={(event) => setHabitForm((current) => ({ ...current, categoryId: Number(event.target.value) || 1 }))}>
                      {categoryOptions.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}
                    </select>
                  </label>
                  <label className="app-field"><span>Название</span><input value={habitForm.name} onChange={(event) => setHabitForm((current) => ({ ...current, name: event.target.value }))} required /></label>
                  <label className="app-field auth-grid-wide"><span>Описание</span><input value={habitForm.description} onChange={(event) => setHabitForm((current) => ({ ...current, description: event.target.value }))} /></label>
                  <label className="app-field"><span>Цель</span><input type="number" value={habitForm.targetValue} onChange={(event) => setHabitForm((current) => ({ ...current, targetValue: Number(event.target.value) || 1 }))} required /></label>
                  <label className="app-field"><span>Единица</span><input value={habitForm.unit} onChange={(event) => setHabitForm((current) => ({ ...current, unit: event.target.value }))} required /></label>
                  <label className="app-field"><span>Дата старта</span><input type="date" value={habitForm.startDate} onChange={(event) => setHabitForm((current) => ({ ...current, startDate: event.target.value }))} required /></label>
                  <label className="app-field"><span>Дата завершения</span><input type="date" value={habitForm.endDate ?? ""} onChange={(event) => setHabitForm((current) => ({ ...current, endDate: event.target.value || null }))} /></label>
                  <label className="app-field auth-grid-wide"><span>Время выполнения</span><input type="time" value={(habitForm.schedules[0]?.timeOfDay ?? "09:00:00").slice(0, 5)} onChange={(event) => setHabitForm((current) => ({ ...current, schedules: [{ ...(current.schedules[0] ?? { dayOfWeek: null, minTimesPerDay: 1, isEnabled: true }), timeOfDay: `${event.target.value || "09:00"}:00` }] }))} /></label>
                  <button className="app-primary-button app-primary-button-wide auth-grid-wide" type="submit" disabled={updateHabitMutation.isPending}>{updateHabitMutation.isPending ? "Сохраняем..." : "Сохранить изменения"}</button>
                </form>
              </>
            ) : (
              <p className="empty-copy">Выберите привычку внутри календаря, чтобы открыть ее рабочую зону.</p>
            )}
          </article>

          <article className="app-card">
            <div className="card-head-inline">
              <div>
                <p className="app-kicker">План на сегодня</p>
                <h2>Быстрые действия без лишних переходов</h2>
              </div>
            </div>
            <div className="tracker-today-list">
              {(todayQuery.data ?? []).map((habit) => (
                <div key={habit.id} className="tracker-today-row">
                  <div>
                    <strong>{habit.name}</strong>
                    <p>{habit.categoryName} • {formatPlannedTime(habit.plannedTime)} • {formatTarget(habit.targetValue, habit.unit)}</p>
                  </div>
                  <button
                    type="button"
                    className="app-primary-button"
                    disabled={habit.completedToday || checkInMutation.isPending}
                    onClick={() => checkInMutation.mutate({
                      habitId: habit.id,
                      date: habit.date,
                      value: habit.targetValue ?? 1,
                      comment: `Выполнение привычки ${habit.name}`
                    })}
                  >
                    {habit.completedToday ? "Уже выполнено" : "Отметить выполнение"}
                  </button>
                </div>
              ))}
              {!todayQuery.data?.length ? <p className="empty-copy">На сегодня пока нет запланированных привычек.</p> : null}
            </div>
          </article>

          <article className="app-card dashboard-achievements-card">
            <div className="card-head-inline">
              <div>
                <p className="app-kicker">Полученные достижения</p>
                <h2>Что уже закреплено в вашем ритме</h2>
              </div>
            </div>
            <div className="dashboard-achievements-grid">
              {(achievementsQuery.data ?? []).slice(0, 4).map((achievement) => (
                <div key={achievement.code + achievement.awardedAt} className="dashboard-achievement-item">
                  <div className="dashboard-achievement-head">
                    <strong>{achievement.name}</strong>
                    <span className="soft-chip">{achievement.rarity}</span>
                  </div>
                  <p>{achievement.description}</p>
                  <small>Получено {formatAchievementDate(achievement.awardedAt)}</small>
                </div>
              ))}
              {!achievementsQuery.data?.length ? <p className="empty-copy">Как только вы выполните первые действия, здесь появятся ваши награды.</p> : null}
            </div>
          </article>
        </div>

        <div className="dashboard-clean-side">
          <article className="app-card">
            <div className="card-head-inline">
              <div>
                <p className="app-kicker">Новая привычка</p>
                <h2>Добавьте следующий повторяемый сценарий</h2>
              </div>
            </div>
            <form className="app-form" onSubmit={submitNewHabit}>
              <label className="app-field"><span>Категория</span><select className="app-select" value={newHabitForm.categoryId} onChange={(event) => setNewHabitForm((current) => ({ ...current, categoryId: Number(event.target.value) || 1 }))}>{categoryOptions.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}</select></label>
              <label className="app-field"><span>Название</span><input value={newHabitForm.name} onChange={(event) => setNewHabitForm((current) => ({ ...current, name: event.target.value }))} required /></label>
              <label className="app-field"><span>Описание</span><input value={newHabitForm.description} onChange={(event) => setNewHabitForm((current) => ({ ...current, description: event.target.value }))} /></label>
              <label className="app-field"><span>Цель</span><input type="number" value={newHabitForm.targetValue} onChange={(event) => setNewHabitForm((current) => ({ ...current, targetValue: Number(event.target.value) || 1 }))} required /></label>
              <label className="app-field"><span>Единица</span><input value={newHabitForm.unit} onChange={(event) => setNewHabitForm((current) => ({ ...current, unit: event.target.value }))} required /></label>
              <label className="app-field"><span>Дата старта</span><input type="date" value={newHabitForm.startDate} onChange={(event) => setNewHabitForm((current) => ({ ...current, startDate: event.target.value }))} required /></label>
              <label className="app-field"><span>Дата завершения</span><input type="date" value={newHabitForm.endDate ?? ""} onChange={(event) => setNewHabitForm((current) => ({ ...current, endDate: event.target.value || null }))} /></label>
              <label className="app-field"><span>Время выполнения</span><input type="time" value={(newHabitForm.schedules[0]?.timeOfDay ?? "09:00:00").slice(0, 5)} onChange={(event) => setNewHabitForm((current) => ({ ...current, schedules: [{ ...(current.schedules[0] ?? { dayOfWeek: null, minTimesPerDay: 1, isEnabled: true }), timeOfDay: `${event.target.value || "09:00"}:00` }] }))} /></label>
              <button className="app-primary-button app-primary-button-wide" type="submit" disabled={createHabitMutation.isPending}>{createHabitMutation.isPending ? "Создаем..." : "Создать привычку"}</button>
              {createHabitMutation.isError ? <p className="app-feedback app-feedback-error">{getApiErrorMessage(createHabitMutation.error, "Не удалось создать привычку.")}</p> : null}
            </form>
          </article>

          <article className="app-card">
            <div className="card-head-inline">
              <div>
                <p className="app-kicker">Челленджи</p>
                <h2>{challengeDetailsQuery.data?.name ?? "Создайте новый челлендж"}</h2>
                <p className="empty-copy">{challengeDetailsQuery.data?.targets[0] ? describeChallengeRule(challengeDetailsQuery.data.targets[0]) : "Челленджи засчитывают только подходящие привычки, а не все подряд."}</p>
              </div>
            </div>

            {challengeDetailsQuery.data ? (
              <div className="tracker-challenge-focus">
                <div className="home-stat-card"><span>Прогресс</span><strong>{Math.round(challengeDetailsQuery.data.currentUserProgress?.completionPercent ?? 0)}%</strong></div>
                <div className="home-stat-card"><span>Участники</span><strong>{challengeDetailsQuery.data.participants.length}</strong></div>
                <div className="tracker-linked-habits">
                  {selectedChallengeHabits.length ? selectedChallengeHabits.map((habit) => (
                    <div key={habit.id} className="tracker-linked-habit-row">
                      <div>
                        <strong>{habit.name}</strong>
                        <p>{habit.categoryName} • {formatTarget(habit.targetValue, habit.unit)}</p>
                      </div>
                    </div>
                  )) : <p className="empty-copy">Пока нет привычек, которые подходят под условия этого челленджа.</p>}
                </div>
                <button type="button" className="app-secondary-button app-primary-button-wide" onClick={() => leaveChallengeMutation.mutate(challengeDetailsQuery.data!.id)} disabled={leaveChallengeMutation.isPending}>
                  {leaveChallengeMutation.isPending ? "Выходим..." : "Выйти из челленджа"}
                </button>
              </div>
            ) : null}

            <form className="app-form" onSubmit={submitChallenge}>
              <label className="app-field"><span>Название челленджа</span><input value={challengeForm.name} onChange={(event) => setChallengeForm((current) => ({ ...current, name: event.target.value }))} required /></label>
              <label className="app-field"><span>Описание</span><input value={challengeForm.description} onChange={(event) => setChallengeForm((current) => ({ ...current, description: event.target.value }))} required /></label>
              <label className="app-field"><span>Цель</span><input type="number" value={challengeForm.goalValue} onChange={(event) => setChallengeForm((current) => ({ ...current, goalValue: Number(event.target.value) || 1 }))} required /></label>
              <label className="app-field"><span>Категория челленджа</span><select className="app-select" value={challengeForm.targets[0]?.categoryId ?? 1} onChange={(event) => setChallengeForm((current) => ({ ...current, targets: [{ targetKind: "CATEGORY", categoryId: Number(event.target.value) || 1 }] }))}>{categoryOptions.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}</select></label>
              <label className="app-field"><span>Обложка</span><input value={challengeForm.coverImageUrl ?? ""} onChange={(event) => setChallengeForm((current) => ({ ...current, coverImageUrl: event.target.value }))} placeholder="https://example.com/cover.jpg" /></label>
              <button className="app-primary-button app-primary-button-wide" type="submit" disabled={createChallengeMutation.isPending}>{createChallengeMutation.isPending ? "Создаем..." : "Создать челлендж"}</button>
              {createChallengeMutation.isError ? <p className="app-feedback app-feedback-error">{getApiErrorMessage(createChallengeMutation.error, "Не удалось создать челлендж.")}</p> : null}
            </form>
          </article>
        </div>
      </div>
    </section>
  );
}

