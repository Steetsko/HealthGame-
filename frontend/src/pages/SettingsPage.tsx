import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  disconnectGoogleCalendar,
  getBackendBaseUrl,
  getCurrentUser,
  getGoogleCalendarAgenda,
  updateCurrentUser,
  type UpdateProfilePayload
} from "../lib/api";
import { getApiErrorMessage } from "../lib/errors";
import { readFileAsDataUrl } from "../lib/fileDataUrl";

type SettingsIconName =
  | "user"
  | "mail"
  | "phone"
  | "camera"
  | "clock"
  | "calendar"
  | "shield"
  | "check"
  | "alert"
  | "link"
  | "unlink";

function SettingsIcon({ name }: { name: SettingsIconName }) {
  if (name === "mail") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 6h16v12H4z" />
        <path d="m4 8 8 6 8-6" />
      </svg>
    );
  }
  if (name === "phone") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3 19.4 19.4 0 0 1-6-6 19.8 19.8 0 0 1-3-8.7A2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7l.4 3a2 2 0 0 1-.6 1.8l-1.3 1.3a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 1.8-.6l3 .4A2 2 0 0 1 22 16.9Z" />
      </svg>
    );
  }
  if (name === "camera") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 7h4l2-2h4l2 2h4v12H4z" />
        <circle cx="12" cy="13" r="3.5" />
      </svg>
    );
  }
  if (name === "clock") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </svg>
    );
  }
  if (name === "calendar") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M7 2v4M17 2v4M3 9h18" />
        <rect x="3" y="4" width="18" height="17" rx="2" />
      </svg>
    );
  }
  if (name === "shield") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 3 5 6v5c0 5 3.4 8.7 7 10 3.6-1.3 7-5 7-10V6l-7-3Z" />
        <path d="m9.5 12 1.8 1.8L15 10.2" />
      </svg>
    );
  }
  if (name === "check") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="m5 13 4 4L19 7" />
      </svg>
    );
  }
  if (name === "alert") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 9v4" />
        <path d="M12 17h.01" />
        <path d="M10.3 3.6 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.6a2 2 0 0 0-3.4 0Z" />
      </svg>
    );
  }
  if (name === "link") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10 13a5 5 0 0 0 7 0l2-2a5 5 0 0 0-7-7l-1 1" />
        <path d="M14 11a5 5 0 0 0-7 0l-2 2a5 5 0 1 0 7 7l1-1" />
      </svg>
    );
  }
  if (name === "unlink") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="m18 13 2-2a5 5 0 0 0-7-7l-1 1" />
        <path d="m6 11-2 2a5 5 0 0 0 7 7l1-1" />
        <path d="M8 8 16 16" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" />
      <path d="M4 20a8 8 0 0 1 16 0" />
    </svg>
  );
}

function getInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function SettingsPage() {
  const queryClient = useQueryClient();
  const meQuery = useQuery({ queryKey: ["me"], queryFn: getCurrentUser });
  const calendarQuery = useQuery({
    queryKey: ["google-calendar-agenda"],
    queryFn: getGoogleCalendarAgenda,
    retry: false
  });

  const [form, setForm] = useState<UpdateProfilePayload>({
    email: "",
    phone: "",
    nickname: "",
    firstName: "",
    timezone: "",
    avatarUrl: ""
  });
  const [avatarUploadError, setAvatarUploadError] = useState<string | null>(null);

  useEffect(() => {
    if (!meQuery.data) return;
    setForm({
      email: meQuery.data.email,
      phone: meQuery.data.phone ?? "",
      nickname: meQuery.data.nickname,
      firstName: meQuery.data.firstName ?? "",
      timezone: meQuery.data.timezone,
      avatarUrl: meQuery.data.avatarUrl ?? ""
    });
  }, [meQuery.data]);

  const updateMutation = useMutation({
    mutationFn: updateCurrentUser,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["me"] });
    }
  });

  const disconnectMutation = useMutation({
    mutationFn: disconnectGoogleCalendar,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["google-calendar-agenda"] }),
        queryClient.invalidateQueries({ queryKey: ["me"] })
      ]);
    }
  });

  async function handleAvatarFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setAvatarUploadError("Нужно выбрать изображение.");
      return;
    }

    if (file.size > 1_500_000) {
      setAvatarUploadError("Файл слишком большой. Выберите изображение до 1.5 МБ.");
      return;
    }

    try {
      const dataUrl = await readFileAsDataUrl(file);
      setForm((current) => ({ ...current, avatarUrl: dataUrl }));
      setAvatarUploadError(null);
    } catch {
      setAvatarUploadError("Не удалось прочитать изображение.");
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    updateMutation.mutate(form);
  }

  const googleConnectUrl = `${getBackendBaseUrl()}/oauth2/authorization/google`;
  const googleConnected = calendarQuery.data?.connected ?? false;
  const googleStatusText = calendarQuery.data?.message ?? "Проверяем состояние интеграции...";
  const previewName = form.firstName || form.nickname || "Пользователь";
  const previewInitials = getInitials(previewName || "HG");

  const completionSteps = useMemo(() => {
    return [
      { label: "Никнейм", done: Boolean(form.nickname.trim()) },
      { label: "Имя", done: Boolean(form.firstName.trim()) },
      { label: "Телефон", done: Boolean(form.phone.trim()) },
      { label: "Фото профиля", done: Boolean(form.avatarUrl.trim()) },
      { label: "Часовой пояс", done: Boolean(form.timezone.trim()) },
      { label: "Google аккаунт", done: googleConnected }
    ];
  }, [form.avatarUrl, form.firstName, form.nickname, form.phone, form.timezone, googleConnected]);

  const completedSteps = completionSteps.filter((step) => step.done).length;
  const completionPercent = Math.round((completedSteps / completionSteps.length) * 100);

  return (
    <section className="product-page settings-hub-page">
      <article className="app-card settings-hub-shell">
        <div className="settings-hub-head">
          <div>
            <p className="app-kicker">Настройки аккаунта</p>
            <h1>Управляйте профилем, фото, часовым поясом и интеграциями.</h1>
          </div>
        </div>

        <div className="settings-hub-grid">
          <article className="settings-panel settings-progress-panel">
            <div className="settings-panel-head">
              <span className="settings-icon-chip"><SettingsIcon name="check" /></span>
              <div>
                <strong>Готовность профиля</strong>
                <p>{completedSteps} из {completionSteps.length} шагов выполнено</p>
              </div>
            </div>

            <div className="settings-progress-rail" role="progressbar" aria-valuenow={completionPercent} aria-valuemin={0} aria-valuemax={100} aria-label={`Готовность профиля: ${completionPercent}%`}>
              <span className="settings-progress-fill" style={{ width: `${completionPercent}%` }} />
            </div>
            <span className="settings-progress-value">{completionPercent}%</span>

            <div className="settings-progress-steps">
              {completionSteps.map((step) => (
                <div key={step.label} className={step.done ? "settings-progress-step is-done" : "settings-progress-step"}>
                  <span className="settings-progress-mark"><SettingsIcon name={step.done ? "check" : "alert"} /></span>
                  <span>{step.label}</span>
                </div>
              ))}
            </div>
          </article>

          <article className="settings-panel settings-profile-preview">
            <div className="settings-profile-avatar-wrap">
              {form.avatarUrl ? (
                <img src={form.avatarUrl} alt={previewName} className="settings-profile-avatar" />
              ) : (
                <div className="settings-profile-avatar settings-profile-avatar-fallback">{previewInitials}</div>
              )}
            </div>
            <div className="settings-profile-copy">
              <p className="app-kicker">Текущий профиль</p>
              <strong>{previewName}</strong>
              <span>@{form.nickname || "nickname"}</span>
              <p>{form.email || "user@example.com"}</p>
            </div>
          </article>
        </div>

        <div className="settings-hub-main">
          <article className="settings-panel settings-form-panel">
            <div className="settings-panel-title">
              <strong>Профиль</strong>
              <p>Обновляйте основную информацию профиля и держите кабинет узнаваемым.</p>
            </div>

            <form className="settings-form-grid" onSubmit={submit}>
              <label className="settings-field">
                <span><SettingsIcon name="mail" /> Email</span>
                <input value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} required />
              </label>
              <label className="settings-field">
                <span><SettingsIcon name="user" /> Никнейм</span>
                <input value={form.nickname} onChange={(event) => setForm((current) => ({ ...current, nickname: event.target.value }))} required />
              </label>
              <label className="settings-field">
                <span><SettingsIcon name="user" /> Имя</span>
                <input value={form.firstName} onChange={(event) => setForm((current) => ({ ...current, firstName: event.target.value }))} />
              </label>
              <label className="settings-field">
                <span><SettingsIcon name="phone" /> Телефон</span>
                <input value={form.phone} onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))} />
              </label>
              <label className="settings-field settings-field-wide">
                <span><SettingsIcon name="clock" /> Часовой пояс</span>
                <input value={form.timezone} onChange={(event) => setForm((current) => ({ ...current, timezone: event.target.value }))} required />
              </label>
              <label className="settings-field settings-field-wide">
                <span><SettingsIcon name="camera" /> Ссылка на фото профиля</span>
                <input
                  value={form.avatarUrl}
                  onChange={(event) => setForm((current) => ({ ...current, avatarUrl: event.target.value }))}
                  placeholder="https://example.com/avatar.jpg"
                />
              </label>
              <label className="settings-field settings-field-wide settings-upload-field">
                <span><SettingsIcon name="camera" /> Или загрузите фото с компьютера</span>
                <input type="file" accept="image/*" onChange={handleAvatarFileChange} />
              </label>

              {avatarUploadError ? <p className="app-feedback app-feedback-error settings-field-wide">{avatarUploadError}</p> : null}
              <button className="app-primary-button settings-field-wide" type="submit" disabled={updateMutation.isPending}>
                {updateMutation.isPending ? "Сохраняем..." : "Сохранить изменения"}
              </button>
              {updateMutation.isSuccess ? <p className="app-feedback app-feedback-success settings-field-wide">Изменения сохранены.</p> : null}
              {updateMutation.isError ? (
                <p className="app-feedback app-feedback-error settings-field-wide">
                  {getApiErrorMessage(updateMutation.error, "Не удалось сохранить изменения профиля.")}
                </p>
              ) : null}
            </form>
          </article>

          <aside className="settings-side-stack">
            <article className="settings-panel settings-integration-panel">
              <div className="settings-panel-title">
                <strong>Интеграции</strong>
                <p>Подключайте Google Calendar и переносите активные привычки в календарь.</p>
              </div>

              <div className="settings-integration-card">
                <div className="settings-integration-top">
                  <span className="settings-icon-chip settings-icon-chip-calendar"><SettingsIcon name="calendar" /></span>
                  <div>
                    <strong>Google Calendar</strong>
                    <p>{googleConnected ? "Google Calendar подключен" : "Google Calendar не подключен"}</p>
                  </div>
                </div>
                <span className="settings-integration-status">{googleStatusText}</span>
                <div className="settings-integration-actions">
                  {googleConnected ? (
                    <button
                      type="button"
                      className="app-secondary-button"
                      onClick={() => disconnectMutation.mutate()}
                      disabled={disconnectMutation.isPending}
                    >
                      <SettingsIcon name="unlink" />
                      {disconnectMutation.isPending ? "Отключаем..." : "Отключить Google"}
                    </button>
                  ) : (
                    <a className="app-primary-button" href={googleConnectUrl}>
                      <SettingsIcon name="link" />
                      Подключить Google
                    </a>
                  )}
                  <a className="app-secondary-button" href="/extras/calendar">
                    <SettingsIcon name="calendar" />
                    Перенести привычки в календарь
                  </a>
                </div>
                {disconnectMutation.isError ? (
                  <p className="app-feedback app-feedback-error">
                    {getApiErrorMessage(disconnectMutation.error, "Не удалось отключить Google Calendar.")}
                  </p>
                ) : null}
              </div>
            </article>

            <article className="settings-panel settings-security-panel">
              <div className="settings-panel-title">
                <strong>Безопасность</strong>
                <p>Базовое состояние аккаунта и текущей сессии.</p>
              </div>

              <div className="settings-security-row">
                <span className="settings-icon-chip"><SettingsIcon name="shield" /></span>
                <div>
                  <strong>Аккаунт активен</strong>
                  <p>{meQuery.data?.status === "active" ? "Профиль работает в обычном режиме." : "Состояние аккаунта требует внимания."}</p>
                </div>
              </div>
              <div className="settings-security-row">
                <span className="settings-icon-chip"><SettingsIcon name="check" /></span>
                <div>
                  <strong>JWT-сессия используется для входа</strong>
                  <p>После авторизации кабинет открывается через защищенную сессию приложения.</p>
                </div>
              </div>
            </article>
          </aside>
        </div>
      </article>
    </section>
  );
}
