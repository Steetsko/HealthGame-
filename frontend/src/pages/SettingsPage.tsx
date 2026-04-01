import { FormEvent, useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getCurrentUser, updateCurrentUser, type UpdateProfilePayload } from "../lib/api";
import { getApiErrorMessage } from "../lib/errors";

export function SettingsPage() {
  const qc = useQueryClient();
  const meQuery = useQuery({ queryKey: ["me"], queryFn: getCurrentUser });
  const [form, setForm] = useState<UpdateProfilePayload>({ email: "", phone: "", nickname: "", firstName: "", timezone: "" });

  useEffect(() => {
    if (!meQuery.data) return;
    setForm({
      email: meQuery.data.email,
      phone: meQuery.data.phone ?? "",
      nickname: meQuery.data.nickname,
      firstName: meQuery.data.firstName ?? "",
      timezone: meQuery.data.timezone
    });
  }, [meQuery.data]);

  const updateMutation = useMutation({
    mutationFn: updateCurrentUser,
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["me"] });
    }
  });

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    updateMutation.mutate(form);
  }

  return (
    <section className="product-page settings-clean-shell">
      <article className="settings-clean-hero">
        <div>
          <p className="app-kicker">Настройки аккаунта</p>
          <h1>Профиль должен быть аккуратным, актуальным и только вашим.</h1>
          <p>
            Здесь обновляются основные данные аккаунта. Email и nickname внутри системы остаются уникальными,
            поэтому нельзя сохранить значения, которые уже заняты другим пользователем.
          </p>
        </div>
        <div className="settings-clean-summary">
          <div className="home-stat-card"><span>Статус</span><strong>{meQuery.data?.status ?? "active"}</strong></div>
          <div className="home-stat-card"><span>Часовой пояс</span><strong>{meQuery.data?.timezone ?? "Europe/Minsk"}</strong></div>
          <div className="home-stat-card home-stat-card-wide"><span>Последний вход</span><strong>{meQuery.data?.lastLoginAt ? meQuery.data.lastLoginAt.slice(0, 10) : "—"}</strong></div>
        </div>
      </article>

      <div className="settings-clean-content">
        <article className="app-card settings-clean-form-card">
          <div className="card-head-inline">
            <div>
              <p className="app-kicker">Редактирование профиля</p>
              <h2>Основные данные</h2>
            </div>
          </div>

          <form className="app-form auth-form-grid-2" onSubmit={submit}>
            <label className="app-field"><span>Email</span><input value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} required /></label>
            <label className="app-field"><span>Никнейм</span><input value={form.nickname} onChange={(event) => setForm((current) => ({ ...current, nickname: event.target.value }))} required /></label>
            <label className="app-field"><span>Имя</span><input value={form.firstName} onChange={(event) => setForm((current) => ({ ...current, firstName: event.target.value }))} /></label>
            <label className="app-field"><span>Телефон</span><input value={form.phone} onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))} /></label>
            <label className="app-field auth-grid-wide"><span>Часовой пояс</span><input value={form.timezone} onChange={(event) => setForm((current) => ({ ...current, timezone: event.target.value }))} required /></label>
            <button className="app-primary-button app-primary-button-wide auth-grid-wide" type="submit" disabled={updateMutation.isPending}>{updateMutation.isPending ? "Сохраняем..." : "Сохранить изменения"}</button>
            {updateMutation.isSuccess ? <p className="app-feedback app-feedback-success auth-grid-wide">Профиль обновлен.</p> : null}
            {updateMutation.isError ? <p className="app-feedback app-feedback-error auth-grid-wide">{getApiErrorMessage(updateMutation.error, "Не удалось сохранить изменения профиля.")}</p> : null}
          </form>
        </article>

        <div className="settings-clean-side-column">
          <article className="app-card settings-clean-profile-card">
            <p className="app-kicker">Текущий профиль</p>
            <strong>{meQuery.data?.firstName || meQuery.data?.nickname || "Пользователь"}</strong>
            <p>{meQuery.data?.email ?? "user@example.com"}</p>
            <div className="settings-clean-facts">
              <div className="settings-clean-fact"><span>Никнейм</span><strong>{meQuery.data?.nickname ?? "—"}</strong></div>
              <div className="settings-clean-fact"><span>Телефон</span><strong>{meQuery.data?.phone ?? "Не указан"}</strong></div>
              <div className="settings-clean-fact"><span>Часовой пояс</span><strong>{meQuery.data?.timezone ?? "—"}</strong></div>
              <div className="settings-clean-fact"><span>Дата регистрации</span><strong>{meQuery.data?.registeredAt ? meQuery.data.registeredAt.slice(0, 10) : "—"}</strong></div>
            </div>
          </article>

          <article className="app-card settings-clean-note-card">
            <p className="app-kicker">Что важно помнить</p>
            <div className="timeline-stack">
              <div className="timeline-row"><strong>Уникальность данных</strong><p>Email и nickname не могут совпадать с данными других пользователей.</p></div>
              <div className="timeline-row"><strong>Мгновенное обновление</strong><p>После сохранения новые данные сразу используются в кабинете, челленджах и ленте сообщества.</p></div>
              <div className="timeline-row"><strong>Часовой пояс влияет на ритм</strong><p>От него зависит отображение дат, плана дня и календаря привычек.</p></div>
            </div>
          </article>
        </div>
      </div>
    </section>
  );
}
