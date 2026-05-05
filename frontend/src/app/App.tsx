import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { Link, NavLink, Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { AchievementToastContainer } from "../components/achievements/AchievementToastContainer";
import { normalizeAchievement } from "../components/achievements/achievementMappers";
import { useAchievementNotifications } from "../components/achievements/useAchievementNotifications";
import { DashboardPage } from "../pages/DashboardPage";
import { ExtrasPage } from "../pages/ExtrasPage";
import { ForbiddenPage } from "../pages/ForbiddenPage";
import { HomePage } from "../pages/HomePage";
import { ChallengesPage } from "../pages/ChallengesPage";
import { LandingPage } from "../pages/LandingPage";
import { LoginPage } from "../pages/LoginPage";
import { NotificationsPage } from "../pages/NotificationsPage";
import { NotFoundPage } from "../pages/NotFoundPage";
import { RegisterPage } from "../pages/RegisterPage";
import { SettingsPage } from "../pages/SettingsPage";
import { UserProfilePage } from "../pages/UserProfilePage";
import { getAchievements, getCurrentUser, getUnreadNotificationCount, logout } from "../lib/api";
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
  const location = useLocation();
  const queryClient = useQueryClient();
  const accessToken = useAuthStore((state) => state.accessToken);
  const clear = useAuthStore((state) => state.clear);
  const [extrasOpen, setExtrasOpen] = useState(false);
  const extrasRef = useRef<HTMLDivElement | null>(null);
  const extrasActive = location.pathname.startsWith("/extras");

  useQuery({
    queryKey: ["me"],
    queryFn: getCurrentUser,
    enabled: Boolean(accessToken)
  });

  const unreadNotificationsQuery = useQuery({
    queryKey: ["notifications-unread-count"],
    queryFn: getUnreadNotificationCount,
    enabled: Boolean(accessToken),
    refetchInterval: accessToken ? 45000 : false
  });

  const unreadCount = unreadNotificationsQuery.data?.unreadCount ?? 0;
  const unreadLabel = unreadCount > 99 ? "99+" : String(unreadCount);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!extrasRef.current?.contains(event.target as Node)) {
        setExtrasOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  useEffect(() => {
    setExtrasOpen(false);
  }, [location.pathname]);

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
        <span className="app-brand-mark">
          <img src="/favicon.png" alt="" className="app-brand-logo" />
        </span>
        <div>
          <p className="app-kicker">Сервис полезных привычек</p>
          <strong>HealthGame</strong>
        </div>
      </Link>

      <nav className="app-nav">
        {accessToken ? (
          <>
            <NavLink to="/home" className={({ isActive }) => isActive ? "app-nav-link app-nav-link-active" : "app-nav-link"}>
              Обзор
            </NavLink>
            <NavLink to="/challenges" className={({ isActive }) => isActive ? "app-nav-link app-nav-link-active" : "app-nav-link"}>
              Челленджи
            </NavLink>
            <NavLink to="/dashboard" className={({ isActive }) => isActive ? "app-nav-link app-nav-link-active" : "app-nav-link"}>
              Кабинет
            </NavLink>
            <NavLink to="/settings" className={({ isActive }) => isActive ? "app-nav-link app-nav-link-active" : "app-nav-link"}>
              Настройки
            </NavLink>
            <NavLink to="/notifications" className={({ isActive }) => isActive ? "app-nav-link app-nav-link-active" : "app-nav-link"}>
              <span className="app-nav-label">
                <span>Уведомления</span>
                {unreadCount > 0 ? <span className="app-nav-badge">{unreadLabel}</span> : null}
              </span>
            </NavLink>
            <div className="app-nav-dropdown" ref={extrasRef}>
              <button
                type="button"
                className={extrasActive || extrasOpen ? "app-nav-button app-nav-link-active" : "app-nav-button"}
                onClick={() => setExtrasOpen((current) => !current)}
              >
                Еще
              </button>
              {extrasOpen ? (
                <div className="app-nav-dropdown-menu">
                  <NavLink
                    to="/extras/recommendations"
                    className={({ isActive }) => isActive ? "app-nav-dropdown-link app-nav-dropdown-link-active" : "app-nav-dropdown-link"}
                  >
                    Рекомендации
                  </NavLink>
                  <NavLink
                    to="/extras/calendar"
                    className={({ isActive }) => isActive ? "app-nav-dropdown-link app-nav-dropdown-link-active" : "app-nav-dropdown-link"}
                  >
                    Google-календарь
                  </NavLink>
                </div>
              ) : null}
            </div>
          </>
        ) : (
          <>
            <NavLink to="/" className={({ isActive }) => isActive ? "app-nav-link app-nav-link-active" : "app-nav-link"}>
              Главная
            </NavLink>
            <NavLink to="/login" className={({ isActive }) => isActive ? "app-nav-link app-nav-link-active" : "app-nav-link"}>
              Вход
            </NavLink>
            <NavLink to="/register" className={({ isActive }) => isActive ? "app-nav-link app-nav-link-active" : "app-nav-link"}>
              Регистрация
            </NavLink>
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
  const accessToken = useAuthStore((state) => state.accessToken);
  const achievementsQuery = useQuery({
    queryKey: ["achievements"],
    queryFn: getAchievements,
    enabled: Boolean(accessToken),
    refetchInterval: accessToken ? 15000 : false
  });
  const normalizedAchievements = (achievementsQuery.data ?? []).map((achievement) => normalizeAchievement(achievement));
  const { activeAchievement, closeAchievementToast } = useAchievementNotifications(normalizedAchievements, achievementsQuery.isSuccess);

  return (
    <div className="app-shell">
      <Header />
      <AchievementToastContainer achievement={activeAchievement} onClose={closeAchievementToast} />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/home" element={<ProtectedRoute><HomePage /></ProtectedRoute>} />
        <Route path="/challenges" element={<ProtectedRoute><ChallengesPage /></ProtectedRoute>} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
        <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
        <Route path="/notifications" element={<ProtectedRoute><NotificationsPage /></ProtectedRoute>} />
        <Route path="/extras" element={<Navigate to="/extras/recommendations" replace />} />
        <Route path="/extras/recommendations" element={<ProtectedRoute><ExtrasPage mode="recommendations" /></ProtectedRoute>} />
        <Route path="/extras/calendar" element={<ProtectedRoute><ExtrasPage mode="calendar" /></ProtectedRoute>} />
        <Route path="/users/:id" element={<ProtectedRoute><UserProfilePage /></ProtectedRoute>} />
        <Route path="/forbidden" element={<ForbiddenPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </div>
  );
}
