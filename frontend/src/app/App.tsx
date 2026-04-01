import { Link, NavLink, Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { DashboardPage } from "../pages/DashboardPage";
import { LoginPage } from "../pages/LoginPage";
import { RegisterPage } from "../pages/RegisterPage";
import { LandingPage } from "../pages/LandingPage";
import { ForbiddenPage } from "../pages/ForbiddenPage";
import { NotFoundPage } from "../pages/NotFoundPage";
import { SettingsPage } from "../pages/SettingsPage";
import { HomePage } from "../pages/HomePage";
import { ChallengesPage } from "../pages/ChallengesPage";
import { logout } from "../lib/api";
import { useAuthStore } from "../lib/auth";

function ProtectedRoute({ children }: { children: JSX.Element }) {
  const accessToken = useAuthStore((state) => state.accessToken);
  const location = useLocation();

  if (!accessToken) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return children;
}

function Header() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const accessToken = useAuthStore((state) => state.accessToken);
  const clear = useAuthStore((state) => state.clear);

  const logoutMutation = useMutation({
    mutationFn: logout,
    onSettled: async () => {
      clear();
      await queryClient.invalidateQueries();
      navigate("/login");
    }
  });

  return (
    <header className="app-header">
      <Link to={accessToken ? "/home" : "/"} className="app-brand">
        <span className="app-brand-mark">HG</span>
        <div>
          <p className="app-kicker">Сервис полезных привычек</p>
          <strong>HealthGame</strong>
        </div>
      </Link>

      <nav className="app-nav">
        {accessToken ? (
          <>
            <NavLink to="/home" className={({ isActive }) => isActive ? "app-nav-link app-nav-link-active" : "app-nav-link"}>Обзор</NavLink>
            <NavLink to="/challenges" className={({ isActive }) => isActive ? "app-nav-link app-nav-link-active" : "app-nav-link"}>Челленджи</NavLink>
            <NavLink to="/dashboard" className={({ isActive }) => isActive ? "app-nav-link app-nav-link-active" : "app-nav-link"}>Кабинет</NavLink>
            <NavLink to="/settings" className={({ isActive }) => isActive ? "app-nav-link app-nav-link-active" : "app-nav-link"}>Настройки</NavLink>
          </>
        ) : (
          <>
            <NavLink to="/" className={({ isActive }) => isActive ? "app-nav-link app-nav-link-active" : "app-nav-link"}>Главная</NavLink>
            <NavLink to="/login" className={({ isActive }) => isActive ? "app-nav-link app-nav-link-active" : "app-nav-link"}>Вход</NavLink>
            <NavLink to="/register" className={({ isActive }) => isActive ? "app-nav-link app-nav-link-active" : "app-nav-link"}>Регистрация</NavLink>
          </>
        )}
        {accessToken ? (
          <button type="button" className="app-nav-button" onClick={() => logoutMutation.mutate()}>
            {logoutMutation.isPending ? "Выходим..." : "Выйти"}
          </button>
        ) : null}
      </nav>
    </header>
  );
}

export function App() {
  return (
    <div className="app-shell">
      <Header />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/home" element={<ProtectedRoute><HomePage /></ProtectedRoute>} />
        <Route path="/challenges" element={<ProtectedRoute><ChallengesPage /></ProtectedRoute>} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
        <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
        <Route path="/forbidden" element={<ForbiddenPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </div>
  );
}
