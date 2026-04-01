import { Link, Navigate } from "react-router-dom";
import { useAuthStore } from "../lib/auth";

const featureCards = [
  {
    title: "Привычки",
    text: "Собирайте личную систему полезных действий, задавайте цели и отслеживайте прогресс без таблиц и ручного учета."
  },
  {
    title: "Челленджи",
    text: "Подключайтесь к публичным маршрутам роста или создавайте свои, чтобы держать темп вместе с друзьями и участниками сообщества."
  },
  {
    title: "Достижения",
    text: "Каждое важное усилие превращается в понятный результат, который виден в кабинете и усиливает мотивацию продолжать."
  },
  {
    title: "Сообщество",
    text: "Внутренняя лента, обсуждения и обмен опытом помогают не выпадать из ритма и видеть живые истории других пользователей."
  }
];

const workflow = [
  {
    title: "Создайте личный профиль",
    text: "Регистрация занимает пару минут и сразу открывает доступ к личному кабинету, плану дня и рабочему контуру прогресса."
  },
  {
    title: "Соберите систему привычек",
    text: "Добавьте ключевые действия, укажите цели, единицы измерения и расписание, чтобы день не был абстрактным."
  },
  {
    title: "Держите ритм через день и неделю",
    text: "Отмечайте выполнение, следите за ближайшими днями, подключайтесь к челленджам и превращайте повторения в устойчивый результат."
  }
];

export function LandingPage() {
  const accessToken = useAuthStore((state) => state.accessToken);

  if (accessToken) {
    return <Navigate to="/home" replace />;
  }

  return (
    <section className="landing-page product-page">
      <article className="landing-hero landing-hero-rich">
        <div className="landing-copy">
          <p className="app-kicker">Цифровая система личного роста</p>
          <h1>Сервис, который помогает закреплять полезные привычки и видеть их реальный вес в повседневной жизни.</h1>
          <p>
            HealthGame объединяет личные привычки, план на день, челленджи, достижения и социальный ритм в одном пространстве.
            Это не просто трекер, а рабочая среда, в которой ежедневные усилия превращаются в заметный результат.
          </p>
          <div className="landing-actions">
            <Link to="/register" className="app-primary-button">Начать сейчас</Link>
            <Link to="/login" className="app-secondary-button">Войти в аккаунт</Link>
          </div>
        </div>

        <div className="landing-scene">
          <div className="landing-scene-card landing-scene-card-main">
            <p className="app-kicker">Ритм дня</p>
            <strong>Каждый день должен быть понятным, а не хаотичным.</strong>
            <span>План, привычки, активные челленджи и прогресс собираются в одной картине дня.</span>
          </div>
          <div className="landing-scene-grid">
            <div className="landing-scene-card">
              <strong>12</strong>
              <span>дней серии</span>
            </div>
            <div className="landing-scene-card">
              <strong>4</strong>
              <span>активные цели</span>
            </div>
            <div className="landing-scene-card">
              <strong>89%</strong>
              <span>стабильность недели</span>
            </div>
          </div>
        </div>
      </article>

      <div className="landing-grid">
        <article className="app-card app-card-accent">
          <div className="card-head-inline">
            <div>
              <p className="app-kicker">Как это работает</p>
              <h2>Понятный маршрут от старта до устойчивого результата</h2>
            </div>
          </div>
          <div className="step-stack">
            {workflow.map((step, index) => (
              <div key={step.title} className="step-row">
                <span className="step-index">0{index + 1}</span>
                <div>
                  <strong>{step.title}</strong>
                  <p>{step.text}</p>
                </div>
              </div>
            ))}
          </div>
        </article>

        <article className="app-card landing-feature-card">
          <div className="card-head-inline">
            <div>
              <p className="app-kicker">Возможности сервиса</p>
              <h2>Все, что нужно, чтобы прогресс не терялся по дороге</h2>
            </div>
          </div>
          <div className="feature-grid">
            {featureCards.map((feature) => (
              <div key={feature.title} className="feature-tile feature-tile-rich">
                <strong>{feature.title}</strong>
                <p>{feature.text}</p>
              </div>
            ))}
          </div>
        </article>
      </div>

      <article className="cta-banner cta-banner-rich">
        <div>
          <p className="app-kicker">Начать сейчас</p>
          <h2>Постройте личную систему полезных привычек, которая держится на реальных действиях.</h2>
          <p>
            Зарегистрируйтесь, добавьте первые привычки и превратите личный кабинет в точку,
            в которой хочется возвращаться каждый день.
          </p>
        </div>
        <div className="landing-actions">
          <Link to="/register" className="app-primary-button">Создать аккаунт</Link>
          <Link to="/login" className="app-secondary-button">У меня уже есть вход</Link>
        </div>
      </article>
    </section>
  );
}
