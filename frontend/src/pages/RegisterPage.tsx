import { FormEvent, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { register, type RegisterPayload } from "../lib/api";
import { getApiErrorMessage } from "../lib/errors";

const initialRegisterForm: RegisterPayload = {
  email: "",
  phone: "+37529",
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
      setSuccessMessage("\u0410\u043a\u043a\u0430\u0443\u043d\u0442 \u0441\u043e\u0437\u0434\u0430\u043d. \u041c\u043e\u0436\u043d\u043e \u0441\u0440\u0430\u0437\u0443 \u043f\u0435\u0440\u0435\u0439\u0442\u0438 \u043a\u043e \u0432\u0445\u043e\u0434\u0443 \u0438 \u043e\u0442\u043a\u0440\u044b\u0442\u044c \u043b\u0438\u0447\u043d\u044b\u0439 \u043a\u0430\u0431\u0438\u043d\u0435\u0442.");
      setTimeout(() => {
        navigate("/login", { state: { loginHint: form.email } });
      }, 900);
    }
  });

  function submitRegister(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSuccessMessage(null);
    registerMutation.mutate(form);
  }

  return (
    <section className="auth-screen auth-screen-reversed auth-screen-gallery product-page">
      <article className="auth-form-panel auth-form-panel-rich">
        <div className="auth-panel-header">
          <p className="app-kicker">{"\u0421\u0442\u0430\u0440\u0442 \u0432 \u0441\u0438\u0441\u0442\u0435\u043c\u0435"}</p>
          <h2>{"\u0421\u043e\u0437\u0434\u0430\u0439\u0442\u0435 \u0430\u043a\u043a\u0430\u0443\u043d\u0442, \u0441 \u043a\u043e\u0442\u043e\u0440\u043e\u0433\u043e \u043d\u0430\u0447\u043d\u0435\u0442\u0441\u044f \u043b\u0438\u0447\u043d\u044b\u0439 \u0440\u0438\u0442\u043c \u043f\u0440\u043e\u0433\u0440\u0435\u0441\u0441\u0430."}</h2>
          <p>{"\u041f\u0440\u043e\u0444\u0438\u043b\u044c \u043d\u0443\u0436\u0435\u043d, \u0447\u0442\u043e\u0431\u044b \u0441\u043e\u0445\u0440\u0430\u043d\u044f\u0442\u044c \u043f\u0440\u0438\u0432\u044b\u0447\u043a\u0438, \u0432\u0441\u0442\u0443\u043f\u0430\u0442\u044c \u0432 \u0447\u0435\u043b\u043b\u0435\u043d\u0434\u0436\u0438, \u0444\u0438\u043a\u0441\u0438\u0440\u043e\u0432\u0430\u0442\u044c \u0434\u043e\u0441\u0442\u0438\u0436\u0435\u043d\u0438\u044f \u0438 \u0434\u0435\u0440\u0436\u0430\u0442\u044c \u043b\u0438\u0447\u043d\u0443\u044e \u0441\u0442\u0430\u0442\u0438\u0441\u0442\u0438\u043a\u0443 \u0432 \u0430\u043a\u0442\u0443\u0430\u043b\u044c\u043d\u043e\u043c \u0432\u0438\u0434\u0435."}</p>
        </div>

        <form className="auth-form-grid-2" onSubmit={submitRegister}>
          <label className="app-field">
            <span>Email</span>
            <input value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} placeholder="name@example.com" required />
          </label>
          <label className="app-field">
            <span>{"\u041d\u0438\u043a\u043d\u0435\u0439\u043c"}</span>
            <input value={form.nickname} onChange={(event) => setForm((current) => ({ ...current, nickname: event.target.value }))} placeholder="your_nickname" required />
          </label>
          <label className="app-field">
            <span>{"\u041f\u0430\u0440\u043e\u043b\u044c"}</span>
            <input type="password" value={form.password} onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))} placeholder={"\u041f\u0440\u0438\u0434\u0443\u043c\u0430\u0439\u0442\u0435 \u043d\u0430\u0434\u0435\u0436\u043d\u044b\u0439 \u043f\u0430\u0440\u043e\u043b\u044c"} required />
          </label>
          <label className="app-field">
            <span>{"\u0427\u0430\u0441\u043e\u0432\u043e\u0439 \u043f\u043e\u044f\u0441"}</span>
            <input value={form.timezone} onChange={(event) => setForm((current) => ({ ...current, timezone: event.target.value }))} placeholder="Europe/Minsk" required />
          </label>
          <label className="app-field auth-grid-wide">
            <span>{"\u0422\u0435\u043b\u0435\u0444\u043e\u043d"}</span>
            <input value={form.phone} onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))} placeholder="+375291112233" required />
          </label>
          <label className="app-field auth-grid-wide">
            <span>{"\u0418\u043c\u044f"}</span>
            <input value={form.firstName} onChange={(event) => setForm((current) => ({ ...current, firstName: event.target.value }))} placeholder={"\u0410\u043d\u0430\u0441\u0442\u0430\u0441\u0438\u044f"} required />
          </label>

          <button className="app-primary-button app-primary-button-wide auth-grid-wide" type="submit" disabled={registerMutation.isPending}>
            {registerMutation.isPending ? "\u0421\u043e\u0437\u0434\u0430\u0435\u043c \u0430\u043a\u043a\u0430\u0443\u043d\u0442..." : "\u0421\u043e\u0437\u0434\u0430\u0442\u044c \u0430\u043a\u043a\u0430\u0443\u043d\u0442"}
          </button>

          {registerMutation.isError ? (
            <p className="app-feedback app-feedback-error auth-grid-wide">
              {getApiErrorMessage(registerMutation.error, "\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u0437\u0430\u0432\u0435\u0440\u0448\u0438\u0442\u044c \u0440\u0435\u0433\u0438\u0441\u0442\u0440\u0430\u0446\u0438\u044e. \u041f\u0440\u043e\u0432\u0435\u0440\u044c\u0442\u0435 \u0434\u0430\u043d\u043d\u044b\u0435 \u0438 \u043f\u043e\u043f\u0440\u043e\u0431\u0443\u0439\u0442\u0435 \u0441\u043d\u043e\u0432\u0430.")}
            </p>
          ) : null}

          {successMessage ? <p className="app-feedback app-feedback-success auth-grid-wide">{successMessage}</p> : null}
        </form>

        <div className="auth-footer-links">
          <span>{"\u0423\u0436\u0435 \u0435\u0441\u0442\u044c \u0430\u043a\u043a\u0430\u0443\u043d\u0442?"}</span>
          <Link to="/login">{"\u041f\u0435\u0440\u0435\u0439\u0442\u0438 \u043a\u043e \u0432\u0445\u043e\u0434\u0443"}</Link>
        </div>
      </article>

      <article className="auth-hero-panel auth-hero-register auth-visual-register">
        <div className="auth-visual-shell">
          <p className="app-kicker">{"\u0417\u0430\u043f\u0443\u0441\u043a \u0441\u0438\u0441\u0442\u0435\u043c\u044b"}</p>
          <h1>{"\u0421\u043e\u0431\u0435\u0440\u0438\u0442\u0435 \u0430\u043a\u043a\u0430\u0443\u043d\u0442, \u043a\u043e\u0442\u043e\u0440\u044b\u0439 \u0431\u0443\u0434\u0435\u0442 \u0434\u0435\u0440\u0436\u0430\u0442\u044c \u0432\u0430\u0448 \u043f\u0440\u043e\u0433\u0440\u0435\u0441\u0441 \u0432 \u043e\u0434\u043d\u043e\u043c \u043c\u0435\u0441\u0442\u0435."}</h1>
          <p>{"\u041d\u043e\u0432\u044b\u0439 \u043f\u0440\u043e\u0444\u0438\u043b\u044c \u0441\u0440\u0430\u0437\u0443 \u0441\u0442\u0430\u043d\u0435\u0442 \u043e\u043f\u043e\u0440\u043d\u043e\u0439 \u0442\u043e\u0447\u043a\u043e\u0439 \u0434\u043b\u044f \u043f\u043b\u0430\u043d\u0430 \u043d\u0430 \u0434\u0435\u043d\u044c, \u0441\u043b\u0435\u0434\u0430 \u043f\u0440\u0438\u0432\u044b\u0447\u0435\u043a, \u0447\u0435\u043b\u043b\u0435\u043d\u0434\u0436\u0435\u0439 \u0438 \u0434\u043e\u0441\u0442\u0438\u0436\u0435\u043d\u0438\u0439."}</p>
        </div>

        <div className="auth-visual-stack">
          <div className="auth-visual-card auth-visual-card-highlight">
            <strong>{"\u0423\u043d\u0438\u043a\u0430\u043b\u044c\u043d\u044b\u0439 \u043f\u0440\u043e\u0444\u0438\u043b\u044c"}</strong>
            <span>{"Email \u0438 nickname \u0432\u043d\u0443\u0442\u0440\u0438 \u0441\u0438\u0441\u0442\u0435\u043c\u044b \u0434\u043e\u043b\u0436\u043d\u044b \u043e\u0441\u0442\u0430\u0432\u0430\u0442\u044c\u0441\u044f \u0442\u043e\u043b\u044c\u043a\u043e \u0432\u0430\u0448\u0438\u043c\u0438."}</span>
          </div>
          <div className="auth-visual-grid">
            <div className="auth-visual-card">
              <strong>{"\u041f\u043b\u0430\u043d"}</strong>
              <span>{"\u043f\u0440\u0438\u0432\u044b\u0447\u043a\u0438, \u0446\u0435\u043b\u0438, \u0441\u043b\u0435\u0434"}</span>
            </div>
            <div className="auth-visual-card">
              <strong>{"\u0422\u0435\u043c\u043f"}</strong>
              <span>{"\u0447\u0435\u043b\u043b\u0435\u043d\u0434\u0436\u0438 \u0438 \u0441\u0435\u0440\u0438\u0438"}</span>
            </div>
            <div className="auth-visual-card auth-visual-card-wide">
              <strong>{"\u0421\u0440\u0430\u0437\u0443 \u0433\u043e\u0442\u043e\u0432\u043e \u043a \u0437\u0430\u043f\u0443\u0441\u043a\u0443"}</strong>
              <span>{"\u041f\u043e\u0441\u043b\u0435 \u0440\u0435\u0433\u0438\u0441\u0442\u0440\u0430\u0446\u0438\u0438 \u043c\u043e\u0436\u043d\u043e \u0441\u0440\u0430\u0437\u0443 \u0432\u043e\u0439\u0442\u0438 \u0438 \u043f\u0435\u0440\u0435\u0439\u0442\u0438 \u043a \u043f\u0435\u0440\u0432\u044b\u043c \u0440\u0430\u0431\u043e\u0447\u0438\u043c \u0448\u0430\u0433\u0430\u043c."}</span>
            </div>
          </div>
        </div>
      </article>
    </section>
  );
}