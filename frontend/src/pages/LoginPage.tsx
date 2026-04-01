import { FormEvent, useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { login, type LoginPayload } from "../lib/api";
import { useAuthStore } from "../lib/auth";
import { getApiErrorMessage } from "../lib/errors";

type LoginLocationState = {
  loginHint?: string;
};

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const locationState = location.state as LoginLocationState | null;
  const setTokens = useAuthStore((state) => state.setTokens);
  const accessToken = useAuthStore((state) => state.accessToken);
  const [loginForm, setLoginForm] = useState<LoginPayload>({
    login: locationState?.loginHint ?? "",
    password: ""
  });

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
          <p className="app-kicker">{"\u0412\u043e\u0437\u0432\u0440\u0430\u0449\u0435\u043d\u0438\u0435 \u0432 \u0440\u0438\u0442\u043c"}</p>
          <h1>{"\u0417\u0430\u0445\u043e\u0434\u0438\u0442\u0435 \u0432 \u043a\u0430\u0431\u0438\u043d\u0435\u0442, \u0433\u0434\u0435 \u043f\u0440\u043e\u0433\u0440\u0435\u0441\u0441 \u0443\u0436\u0435 \u0441\u043e\u0431\u0440\u0430\u043d \u0432 \u043e\u0434\u043d\u0443 \u0441\u0438\u0441\u0442\u0435\u043c\u0443."}</h1>
          <p>{"\u041f\u043e\u0441\u043b\u0435 \u0432\u0445\u043e\u0434\u0430 \u0432\u044b \u0441\u0440\u0430\u0437\u0443 \u0432\u0438\u0434\u0438\u0442\u0435 \u0444\u043e\u043a\u0443\u0441 \u0434\u043d\u044f, \u0430\u043a\u0442\u0438\u0432\u043d\u044b\u0435 \u0447\u0435\u043b\u043b\u0435\u043d\u0434\u0436\u0438, \u043b\u0438\u0447\u043d\u0443\u044e \u0441\u0442\u0430\u0442\u0438\u0441\u0442\u0438\u043a\u0443 \u0438 \u0431\u044b\u0441\u0442\u0440\u044b\u0435 \u0434\u0435\u0439\u0441\u0442\u0432\u0438\u044f \u0431\u0435\u0437 \u043b\u0438\u0448\u043d\u0438\u0445 \u043f\u0435\u0440\u0435\u043a\u043b\u044e\u0447\u0435\u043d\u0438\u0439."}</p>
        </div>

        <div className="auth-visual-stack">
          <div className="auth-visual-card auth-visual-card-highlight">
            <strong>{"\u041f\u043b\u0430\u043d \u043d\u0430 \u0441\u0435\u0433\u043e\u0434\u043d\u044f"}</strong>
            <span>{"\u0412\u044b \u0441\u0440\u0430\u0437\u0443 \u0437\u0430\u0445\u043e\u0434\u0438\u0442\u0435 \u0432 \u0442\u043e\u0447\u043a\u0443, \u0433\u0434\u0435 \u043f\u043e\u043d\u044f\u0442\u043d\u043e, \u0447\u0442\u043e \u0438\u043c\u0435\u043d\u043d\u043e \u0432\u0430\u0436\u043d\u043e \u0441\u0434\u0435\u043b\u0430\u0442\u044c \u0441\u0435\u0439\u0447\u0430\u0441."}</span>
          </div>
          <div className="auth-visual-grid">
            <div className="auth-visual-card">
              <strong>3</strong>
              <span>{"\u0430\u043a\u0442\u0438\u0432\u043d\u044b\u0445 \u0447\u0435\u043b\u043b\u0435\u043d\u0434\u0436\u0430"}</span>
            </div>
            <div className="auth-visual-card">
              <strong>12</strong>
              <span>{"\u0434\u043d\u0435\u0439 \u0441\u0435\u0440\u0438\u0438"}</span>
            </div>
            <div className="auth-visual-card auth-visual-card-wide">
              <strong>{"\u0412\u0445\u043e\u0434 \u0431\u0435\u0437 \u0442\u0440\u0435\u043d\u0438\u044f"}</strong>
              <span>{"\u0412\u0430\u0448 \u043a\u0430\u0431\u0438\u043d\u0435\u0442 \u0433\u043e\u0442\u043e\u0432 \u043a \u0440\u0430\u0431\u043e\u0442\u0435 \u0441\u0440\u0430\u0437\u0443 \u043f\u043e\u0441\u043b\u0435 \u0430\u0432\u0442\u043e\u0440\u0438\u0437\u0430\u0446\u0438\u0438."}</span>
            </div>
          </div>
        </div>
      </article>

      <article className="auth-form-panel auth-form-panel-rich">
        <div className="auth-panel-header">
          <p className="app-kicker">{"\u0412\u0445\u043e\u0434 \u0432 \u0430\u043a\u043a\u0430\u0443\u043d\u0442"}</p>
          <h2>{"\u0412\u0435\u0440\u043d\u0438\u0442\u0435\u0441\u044c \u043a \u0441\u0432\u043e\u0435\u043c\u0443 \u0442\u0435\u043c\u043f\u0443."}</h2>
          <p>{"\u0418\u0441\u043f\u043e\u043b\u044c\u0437\u0443\u0439\u0442\u0435 email \u0438\u043b\u0438 nickname, \u0447\u0442\u043e\u0431\u044b \u0431\u044b\u0441\u0442\u0440\u043e \u043e\u0442\u043a\u0440\u044b\u0442\u044c \u043b\u0438\u0447\u043d\u044b\u0439 \u043a\u0430\u0431\u0438\u043d\u0435\u0442 \u0438 \u043f\u0440\u043e\u0434\u043e\u043b\u0436\u0438\u0442\u044c \u0442\u0435\u043a\u0443\u0449\u0438\u0439 \u0446\u0438\u043a\u043b \u043f\u0440\u043e\u0433\u0440\u0435\u0441\u0441\u0430."}</p>
        </div>

        <form className="auth-form-single" onSubmit={submitLogin}>
          <label className="app-field">
            <span>{"\u041b\u043e\u0433\u0438\u043d \u0438\u043b\u0438 email"}</span>
            <input
              value={loginForm.login}
              onChange={(event) => setLoginForm((current) => ({ ...current, login: event.target.value }))}
              placeholder="user@example.com"
              required
            />
          </label>
          <label className="app-field">
            <span>{"\u041f\u0430\u0440\u043e\u043b\u044c"}</span>
            <input
              type="password"
              value={loginForm.password}
              onChange={(event) => setLoginForm((current) => ({ ...current, password: event.target.value }))}
              placeholder={"\u0412\u0432\u0435\u0434\u0438\u0442\u0435 \u043f\u0430\u0440\u043e\u043b\u044c"}
              required
            />
          </label>

          <button className="app-primary-button app-primary-button-wide" type="submit" disabled={loginMutation.isPending}>
            {loginMutation.isPending ? "\u041e\u0442\u043a\u0440\u044b\u0432\u0430\u0435\u043c \u043a\u0430\u0431\u0438\u043d\u0435\u0442..." : "\u0412\u043e\u0439\u0442\u0438"}
          </button>

          {loginMutation.isError ? (
            <p className="app-feedback app-feedback-error">
              {getApiErrorMessage(loginMutation.error, "\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u0432\u043e\u0439\u0442\u0438. \u041f\u0440\u043e\u0432\u0435\u0440\u044c\u0442\u0435 \u043b\u043e\u0433\u0438\u043d \u0438 \u043f\u0430\u0440\u043e\u043b\u044c \u0438 \u043f\u043e\u043f\u0440\u043e\u0431\u0443\u0439\u0442\u0435 \u0441\u043d\u043e\u0432\u0430.")}
            </p>
          ) : null}
        </form>

        <div className="auth-footer-links">
          <span>{"\u041d\u0435\u0442 \u0430\u043a\u043a\u0430\u0443\u043d\u0442\u0430?"}</span>
          <Link to="/register">{"\u041f\u0435\u0440\u0435\u0439\u0442\u0438 \u043a \u0440\u0435\u0433\u0438\u0441\u0442\u0440\u0430\u0446\u0438\u0438"}</Link>
        </div>
      </article>
    </section>
  );
}