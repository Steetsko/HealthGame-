import { FormEvent, useEffect, useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { getBackendBaseUrl, login, type LoginPayload } from "../lib/api";
import { useAuthStore } from "../lib/auth";
import { getApiErrorMessage } from "../lib/errors";

type LoginLocationState = {
  loginHint?: string;
};

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const locationState = location.state as LoginLocationState | null;
  const setTokens = useAuthStore((state) => state.setTokens);
  const accessToken = useAuthStore((state) => state.accessToken);
  const [loginForm, setLoginForm] = useState<LoginPayload>({
    login: locationState?.loginHint ?? "",
    password: ""
  });

  const googleLoginUrl = useMemo(() => `${getBackendBaseUrl()}/oauth2/authorization/google`, []);
  const oauthError = searchParams.get("oauthError");

  useEffect(() => {
    const accessTokenFromQuery = searchParams.get("accessToken");
    const refreshTokenFromQuery = searchParams.get("refreshToken");
    const expiresInSeconds = searchParams.get("expiresInSeconds");
    const refreshExpiresInSeconds = searchParams.get("refreshExpiresInSeconds");

    if (accessTokenFromQuery && refreshTokenFromQuery && expiresInSeconds && refreshExpiresInSeconds) {
      setTokens({
        accessToken: accessTokenFromQuery,
        refreshToken: refreshTokenFromQuery,
        accessTokenExpiresInSeconds: Number(expiresInSeconds),
        refreshTokenExpiresInSeconds: Number(refreshExpiresInSeconds)
      });
      navigate("/home", { replace: true });
    }
  }, [navigate, searchParams, setTokens]);

  useEffect(() => {
    if (accessToken) {
      navigate("/home");
    }
  }, [accessToken, navigate]);

  const loginMutation = useMutation({
    mutationFn: login,
    onSuccess: (data) => {
      setTokens(data);
      navigate("/home");
    }
  });

  function submitLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    loginMutation.mutate(loginForm);
  }

  return (
    <section className="auth-screen auth-screen-gallery product-page">
      <article className="auth-hero-panel auth-hero-login auth-visual-login">
        <div className="auth-visual-shell">
          <p className="app-kicker">Возвращение в ритм</p>
          <h1>Заходите в кабинет, где ваш прогресс уже собран в одну систему.</h1>
          <p>
            После входа вы сразу видите план на сегодня, активные привычки, челленджи,
            достижения и рабочую картину дня без лишних переключений.
          </p>
        </div>

        <div className="auth-visual-stack">
          <div className="auth-visual-card auth-visual-card-highlight">
            <strong>План на сегодня</strong>
            <span>Сразу после входа вы попадаете в точку, где понятно, что делать именно сейчас.</span>
          </div>
          <div className="auth-visual-grid">
            <div className="auth-visual-card">
              <strong>Фокус дня</strong>
              <span>Все ключевые действия собраны в одном экране: без поиска по разделам.</span>
            </div>
            <div className="auth-visual-card">
              <strong>Google-календарь</strong>
              <span>После входа через Google можно подтянуть ближайшие события и сверить их с ритмом привычек.</span>
            </div>
            <div className="auth-visual-card auth-visual-card-wide">
              <strong>Темп без перегруза</strong>
              <span>Кабинет открывается уже готовым к работе: вошли и продолжили свой маршрут без лишних шагов.</span>
            </div>
          </div>
        </div>
      </article>

      <article className="auth-form-panel auth-form-panel-rich">
        <div className="auth-panel-header">
          <p className="app-kicker">Вход в аккаунт</p>
          <h2>Вернитесь к своему темпу.</h2>
          <p>
            Используйте email или nickname, чтобы быстро открыть личный кабинет и продолжить
            текущий цикл прогресса.
          </p>
        </div>

        <form className="auth-form-single" onSubmit={submitLogin}>
          <label className="app-field">
            <span>Логин или email</span>
            <input
              value={loginForm.login}
              onChange={(event) => setLoginForm((current) => ({ ...current, login: event.target.value }))}
              placeholder="user@example.com"
              required
            />
          </label>
          <label className="app-field">
            <span>Пароль</span>
            <input
              type="password"
              value={loginForm.password}
              onChange={(event) => setLoginForm((current) => ({ ...current, password: event.target.value }))}
              placeholder="Введите пароль"
              required
            />
          </label>

          <button className="app-primary-button app-primary-button-wide" type="submit" disabled={loginMutation.isPending}>
            {loginMutation.isPending ? "Открываем кабинет..." : "Войти"}
          </button>

          <a className="app-secondary-button app-primary-button-wide auth-google-button" href={googleLoginUrl}>
            Войти через Google
          </a>

          {oauthError ? <p className="app-feedback app-feedback-error">Не удалось завершить вход через Google. Попробуйте еще раз.</p> : null}
          {loginMutation.isError ? (
            <p className="app-feedback app-feedback-error">
              {getApiErrorMessage(loginMutation.error, "Не удалось войти. Проверьте логин и пароль и попробуйте снова.")}
            </p>
          ) : null}
        </form>

        <div className="auth-footer-links">
          <span>Нет аккаунта?</span>
          <Link to="/register">Перейти к регистрации</Link>
        </div>
      </article>
    </section>
  );
}