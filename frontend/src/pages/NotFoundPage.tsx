import { Link } from "react-router-dom";

export function NotFoundPage() {
  return (
    <section className="message-page">
      <article className="message-card">
        <p className="app-kicker">Страница не найдена</p>
        <h1>Запрошенная страница недоступна</h1>
        <p>Проверьте адрес или воспользуйтесь навигацией, чтобы вернуться на главную страницу или в личный кабинет.</p>
        <div className="landing-actions">
          <Link to="/" className="app-primary-button">На главную</Link>
          <Link to="/dashboard" className="app-secondary-button">В кабинет</Link>
        </div>
      </article>
    </section>
  );
}