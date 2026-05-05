import { FormEvent, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { register, type RegisterPayload } from "../lib/api";
import { getApiErrorMessage } from "../lib/errors";

const initialRegisterForm: RegisterPayload = {
  email: "",
  phone: "",
  password: "",
  nickname: "",
  firstName: "",
  timezone: "Europe/Minsk"
};

export function RegisterPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState<RegisterPayload>(initialRegisterForm);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const registerMutation = useMutation({
    mutationFn: register,
    onSuccess: () => {
      setSuccessMessage("Аккаунт создан. Можно сразу перейти ко входу и открыть личный кабинет.");
      setTimeout(() => {
        navigate("/login", { state: { loginHint: form.email } });
      }, 900);
    }
  });

  function submitRegister(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSuccessMessage(null);
    registerMutation.mutate({
      ...form,
      email: form.email.trim(),
      nickname: form.nickname.trim(),
      firstName: form.firstName.trim(),
      timezone: form.timezone.trim(),
      phone: form.phone && form.phone.trim().length > 0 ? form.phone.trim() : null
    });
  }

  return (
    <section className="auth-screen auth-screen-reversed auth-screen-gallery product-page">
      <article className="auth-form-panel auth-form-panel-rich">
        <div className="auth-panel-header">
          <p className="app-kicker">Старт в системе</p>
          <h2>Создайте аккаунт, с которого начнется ваш личный ритм прогресса.</h2>
          <p>
            Профиль нужен, чтобы сохранять привычки, вступать в челленджи, фиксировать
            достижения и держать личную статистику в одном месте.
          </p>
        </div>

        <form className="auth-form-grid-2" onSubmit={submitRegister}>
          <label className="app-field">
            <span>Email</span>
            <input value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} placeholder="name@example.com" required />
          </label>
          <label className="app-field">
            <span>Никнейм</span>
            <input value={form.nickname} onChange={(event) => setForm((current) => ({ ...current, nickname: event.target.value }))} placeholder="your_nickname" minLength={3} required />
          </label>
          <label className="app-field">
            <span>Пароль</span>
            <input type="password" value={form.password} onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))} placeholder="Придумайте надежный пароль" minLength={8} required />
          </label>
          <label className="app-field">
            <span>Часовой пояс</span>
            <input value={form.timezone} onChange={(event) => setForm((current) => ({ ...current, timezone: event.target.value }))} placeholder="Europe/Minsk" required />
          </label>
          <label className="app-field auth-grid-wide">
            <span>Телефон</span>
            <input value={form.phone ?? ""} onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))} placeholder="+375291112233" />
          </label>
          <label className="app-field auth-grid-wide">
            <span>Имя</span>
            <input value={form.firstName} onChange={(event) => setForm((current) => ({ ...current, firstName: event.target.value }))} placeholder="Анастасия" required />
          </label>

          <button className="app-primary-button app-primary-button-wide auth-grid-wide" type="submit" disabled={registerMutation.isPending}>
            {registerMutation.isPending ? "Создаем аккаунт..." : "Создать аккаунт"}
          </button>

          {registerMutation.isError ? (
            <p className="app-feedback app-feedback-error auth-grid-wide">
              {getApiErrorMessage(registerMutation.error, "Не удалось завершить регистрацию. Проверьте данные и попробуйте снова.")}
            </p>
          ) : null}

          {successMessage ? <p className="app-feedback app-feedback-success auth-grid-wide">{successMessage}</p> : null}
        </form>

        <div className="auth-footer-links">
          <span>Уже есть аккаунт?</span>
          <Link to="/login">Перейти ко входу</Link>
        </div>
      </article>

      <article className="auth-hero-panel auth-hero-register auth-visual-register">
        <div className="auth-visual-shell">
          <p className="app-kicker">Запуск системы</p>
          <h1>Соберите аккаунт, который будет держать ваш прогресс в одном месте.</h1>
          <p>
            Новый профиль сразу станет опорной точкой для привычек, челленджей,
            достижений и ежедневного плана.
          </p>
        </div>

        <div className="auth-visual-stack">
          <div className="auth-visual-card auth-visual-card-highlight">
            <strong>Личный профиль</strong>
            <span>Email и nickname внутри системы остаются уникальными и закреплены за вами.</span>
          </div>
          <div className="auth-visual-grid">
            <div className="auth-visual-card">
              <strong>Привычки</strong>
              <span>Создавайте собственные сценарии и собирайте устойчивый ритм шаг за шагом.</span>
            </div>
            <div className="auth-visual-card">
              <strong>Челленджи</strong>
              <span>Подключайтесь к общим челленджам прогресса и сравнивайте движение с другими.</span>
            </div>
            <div className="auth-visual-card auth-visual-card-wide">
              <strong>Готово к старту</strong>
              <span>После регистрации можно сразу войти и перейти к первым рабочим действиям.</span>
            </div>
          </div>
        </div>
      </article>
    </section>
  );
}
