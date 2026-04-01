import { Link } from "react-router-dom";

export function ForbiddenPage() {
  return (
    <section className="message-page">
      <article className="message-card">
        <p className="app-kicker">Доступ ограничен</p>
        <h1>У вас недостаточно прав для просмотра этой страницы</h1>
        <p>Вернитесь в личный кабинет или войдите под учетной записью с нужным уровнем доступа.</p>
        <div className="landing-actions">
          <Link to="/dashboard" className="app-primary-button">Перейти в кабинет</Link>
          <Link to="/login" className="app-secondary-button">Войти заново</Link>
        </div>
      </article>
    </section>
  );
}