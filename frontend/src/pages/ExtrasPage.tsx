import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  disconnectGoogleCalendar,
  getCurrentUser,
  getGoogleCalendarAgenda,
  getGoogleCalendarConnectLink,
  getWeatherWellness,
  syncGoogleCalendarHabits
} from "../lib/api";
import { getApiErrorMessage } from "../lib/errors";
import type { WeatherWellness } from "../lib/types";

type ExtraMode = "recommendations" | "calendar";

function deriveCityFromTimezone(timezone: string) {
  if (!timezone) return "Minsk";
  const parts = timezone.split("/");
  return (parts[parts.length - 1] || "Minsk").replace(/_/g, " ");
}

function formatCalendarDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Скоро";
  }
  return date.toLocaleString("ru-RU", {
    day: "2-digit",
    month: "long",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function weatherMood(condition?: string) {
  const normalized = (condition ?? "").toLowerCase();
  if (normalized.includes("дожд")) return { emoji: "🌧️", title: "День для аккуратного темпа", className: "weather-scene-rain" };
  if (normalized.includes("снег")) return { emoji: "❄️", title: "День домашнего ритма", className: "weather-scene-snow" };
  if (normalized.includes("пасмур") || normalized.includes("туман")) {
    return { emoji: "☁️", title: "День спокойного фокуса", className: "weather-scene-cloud" };
  }
  return { emoji: "☀️", title: "Хороший день для полезного движения", className: "weather-scene-sun" };
}

function recommendationIcon(category: string) {
  switch (category) {
    case "Вода":
      return "💧";
    case "Активность":
      return "🏃";
    case "Фокус":
      return "🎯";
    case "Восстановление":
      return "🌙";
    case "Безопасность":
      return "🛡️";
    case "Тренировки":
      return "🏋️";
    case "Питание":
      return "🥗";
    default:
      return "✨";
  }
}

function recommendationTone(category: string) {
  switch (category) {
    case "Тренировки":
      return "is-training";
    case "Вода":
      return "is-hydration";
    case "Питание":
      return "is-nutrition";
    case "Восстановление":
      return "is-recovery";
    case "Активность":
      return "is-activity";
    default:
      return "is-focus";
  }
}

function renderWeatherSnapshot(weather: WeatherWellness) {
  return [
    { label: "Температура", value: `${Math.round(weather.temperatureC)}°C` },
    { label: "Ощущается как", value: `${Math.round(weather.apparentTemperatureC)}°C` },
    { label: "Ветер", value: `${Math.round(weather.windSpeed)} км/ч` },
    { label: "Влажность", value: `${Math.round(weather.humidity)}%` },
    { label: "Осадки", value: `${weather.precipitation} мм` },
    { label: "Состояние", value: weather.condition }
  ];
}

export function ExtrasPage({ mode }: { mode: ExtraMode }) {
  const queryClient = useQueryClient();
  const meQuery = useQuery({ queryKey: ["me"], queryFn: getCurrentUser });
  const derivedCity = useMemo(() => deriveCityFromTimezone(meQuery.data?.timezone ?? "Europe/Minsk"), [meQuery.data?.timezone]);

  const weatherQuery = useQuery({
    queryKey: ["weather-wellness", derivedCity],
    queryFn: () => getWeatherWellness(derivedCity),
    enabled: mode === "recommendations"
  });

  const agendaQuery = useQuery({
    queryKey: ["google-calendar-agenda"],
    queryFn: getGoogleCalendarAgenda,
    enabled: mode === "calendar",
    retry: false
  });

  const connectMutation = useMutation({
    mutationFn: () => getGoogleCalendarConnectLink("/extras/calendar"),
    onSuccess: (data) => {
      window.location.href = data.authorizationUrl;
    }
  });

  const syncMutation = useMutation({
    mutationFn: syncGoogleCalendarHabits,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["google-calendar-agenda"] });
    }
  });

  const disconnectMutation = useMutation({
    mutationFn: disconnectGoogleCalendar,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["google-calendar-agenda"] });
    }
  });

  if (mode === "recommendations") {
    const weather = weatherQuery.data;
    const mood = weatherMood(weather?.condition);

    return (
      <section className="product-page extras-page">
        <article className={`app-card weather-hero-card ${mood.className}`}>
          <div className="weather-hero-copy">
            <p className="app-kicker">Погода и самочувствие</p>
            <h1>{mood.title}</h1>
            <p>
              Рекомендации ниже строятся по реальной погоде: температуре, ощущаемой температуре, ветру,
              влажности и осадкам. Это помогает не просто посмотреть прогноз, а сразу подстроить привычки под день.
            </p>
          </div>

          <div className="weather-hero-visual">
            <span className="weather-hero-emoji" aria-hidden="true">{mood.emoji}</span>
            <div className="weather-hero-glass">
              <span>{weather?.city ?? derivedCity}</span>
              <strong>{weather ? `${Math.round(weather.temperatureC)}°C` : "..."}</strong>
              <p>{weather?.condition ?? "Загружаем погоду"}</p>
            </div>
          </div>
        </article>

        <article className="app-card extras-panel">
          <div className="card-head-inline">
            <div>
              <p className="app-kicker">Рекомендации на сегодня</p>
              <h2>Как лучше прожить день в {weather?.city ?? derivedCity}</h2>
            </div>
            <span className="soft-chip">Реальная погода → полезный режим</span>
          </div>

          {weatherQuery.isLoading ? (
            <p className="empty-copy">Загружаем прогноз и подбираем рекомендации...</p>
          ) : weatherQuery.isError ? (
            <p className="app-feedback app-feedback-error">
              {getApiErrorMessage(weatherQuery.error, "Не удалось получить погодные рекомендации.")}
            </p>
          ) : weather ? (
            <>
              <div className="extras-recommendation-grid extras-recommendation-grid-weather">
                {weather.recommendations.map((recommendation, index) => (
                  <article
                    key={`${recommendation.category}-${recommendation.title}`}
                    className={`extras-recommendation-card ${recommendationTone(recommendation.category)} ${index === 0 ? "is-featured" : ""}`}
                  >
                    <div className="extras-recommendation-icon" aria-hidden="true">{recommendationIcon(recommendation.category)}</div>
                    <span>{recommendation.category}</span>
                    <strong>{recommendation.title}</strong>
                    <p>{recommendation.text}</p>
                  </article>
                ))}
              </div>

              <div className="extras-weather-stats">
                {renderWeatherSnapshot(weather).map((item) => (
                  <div key={item.label} className="extras-weather-stat-card">
                    <span>{item.label}</span>
                    <strong>{item.value}</strong>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="empty-copy">Пока нет погодных данных для отображения.</p>
          )}
        </article>
      </section>
    );
  }

  const connected = agendaQuery.data?.connected ?? false;

  return (
    <section className="product-page extras-page">
      <article className="hero-banner extras-calendar-hero">
        <div className="hero-copy-block extras-calendar-copy">
          <p className="app-kicker">Google Calendar</p>
          <h1>Привычки в Google Calendar</h1>
          <p>
            Переносите активные привычки на ближайшие 7 дней и смотрите только полезные события
            без календарного шума.
          </p>
        </div>

        <div className="hero-metrics extras-metrics">
          <div className="metric-tile extras-metric-tile extras-metric-tile-status">
            <span>Статус</span>
            <strong>{connected ? "Подключен" : "Не подключен"}</strong>
          </div>
          <div className="metric-tile extras-metric-tile">
            <span>События</span>
            <strong>{agendaQuery.data?.events.length ?? 0}</strong>
          </div>
          <div className="metric-tile extras-metric-tile">
            <span>Окно синхронизации</span>
            <strong>7 дней</strong>
          </div>
        </div>
      </article>

      <article className="app-card extras-panel">
        <div className="card-head-inline">
          <div>
            <p className="app-kicker">Google Calendar</p>
            <h2>Синхронизация и ближайшие события</h2>
          </div>
          <span className="soft-chip">HealthGame → Google Calendar</span>
        </div>

        {!connected ? (
          <div className="extras-connect-box">
            <p className="empty-copy">
              Google Calendar пока не подключен. Подключите аккаунт, чтобы перенести привычки и увидеть ближайшие события.
            </p>
            <button
              type="button"
              className="app-primary-button integration-connect-button extras-connect-button"
              onClick={() => connectMutation.mutate()}
              disabled={connectMutation.isPending}
            >
              {connectMutation.isPending ? "Открываем Google..." : "Подключить Google"}
            </button>
            {connectMutation.isError ? (
              <p className="app-feedback app-feedback-error">
                {getApiErrorMessage(connectMutation.error, "Не удалось открыть подключение Google Calendar.")}
              </p>
            ) : null}
          </div>
        ) : (
          <div className="extras-calendar-tools">
            <div className="extras-calendar-tool-card">
              <strong>Перенос привычек</strong>
              <p>Создадим события на ближайшие 7 дней только для активных привычек и не будем дублировать уже перенесенные записи.</p>
              <div className="extras-calendar-tool-actions">
                <button
                  className="app-primary-button"
                  type="button"
                  onClick={() => syncMutation.mutate()}
                  disabled={syncMutation.isPending}
                >
                  {syncMutation.isPending ? "Переносим привычки..." : "Перенести привычки на 7 дней"}
                </button>
                <button
                  className="app-secondary-button"
                  type="button"
                  onClick={() => disconnectMutation.mutate()}
                  disabled={disconnectMutation.isPending}
                >
                  {disconnectMutation.isPending ? "Отключаем..." : "Отключить Google"}
                </button>
              </div>

              {syncMutation.isSuccess ? (
                <p className="app-feedback app-feedback-success">
                  {syncMutation.data.message} Создано событий: {syncMutation.data.createdCount}. Пропущено дублей: {syncMutation.data.skippedCount}.
                </p>
              ) : null}

              {syncMutation.isError ? (
                <p className="app-feedback app-feedback-error">
                  {getApiErrorMessage(syncMutation.error, "Не удалось перенести привычки в Google Calendar.")}
                </p>
              ) : null}

              {disconnectMutation.isError ? (
                <p className="app-feedback app-feedback-error">
                  {getApiErrorMessage(disconnectMutation.error, "Не удалось отключить Google Calendar.")}
                </p>
              ) : null}
            </div>
          </div>
        )}

        <div className="extras-calendar-events-block">
          <div className="card-head-inline">
            <div>
              <p className="app-kicker">Ближайшие события</p>
              <h3>События на 14 дней</h3>
            </div>
          </div>

          {agendaQuery.isLoading ? (
            <p className="empty-copy">Загрузка уведомлений...</p>
          ) : agendaQuery.isError ? (
            <p className="app-feedback app-feedback-error">
              {getApiErrorMessage(agendaQuery.error, "Не удалось загрузить ближайшие события")}
            </p>
          ) : connected && agendaQuery.data?.events.length ? (
            <div className="extras-calendar-stack">
              {agendaQuery.data.events.map((event) => (
                <div key={`${event.title}-${event.startAt}`} className="extras-calendar-row">
                  <div>
                    <strong>{event.title}</strong>
                    <p>{formatCalendarDate(event.startAt)}</p>
                  </div>
                  {event.link ? (
                    <a href={event.link} target="_blank" rel="noreferrer" className="app-secondary-button">
                      Открыть
                    </a>
                  ) : null}
                </div>
              ))}
            </div>
          ) : connected ? (
            <p className="empty-copy">На ближайшие дни событий нет.</p>
          ) : (
            <p className="empty-copy">{agendaQuery.data?.message ?? "Google Calendar не подключен."}</p>
          )}
        </div>
      </article>
    </section>
  );
}
