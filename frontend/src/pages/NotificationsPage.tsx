import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  deleteNotification,
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead
} from "../lib/api";
import { getApiErrorMessage } from "../lib/errors";
import type { NotificationItem } from "../lib/types";

type NotificationFilter = "ALL" | "UNREAD";

function formatNotificationDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Недавно";
  return date.toLocaleString("ru-RU", {
    day: "2-digit",
    month: "long",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function NotificationIcon({ type }: { type: string }) {
  const normalized = type?.trim().toUpperCase() ?? "SYSTEM";
  const className = `notifications-icon notifications-icon-${normalized.toLowerCase()}`;

  if (normalized === "BLOG_RECOMMENDATION") {
    return (
      <span className={className} aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M7 10h2l1 2 2-5 2 9 1-3h2" />
          <path d="M12 21s-7-4.6-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 11c0 5.4-7 10-7 10Z" />
        </svg>
      </span>
    );
  }

  if (normalized === "ACHIEVEMENT_UNLOCKED") {
    return (
      <span className={className} aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M8 4h8v3a4 4 0 0 1-8 0V4Z" />
          <path d="M6 6H4a2 2 0 0 0 2 3" />
          <path d="M18 6h2a2 2 0 0 1-2 3" />
          <path d="M12 11v4" />
          <path d="M9 21h6" />
          <path d="M10 15h4l1 6H9l1-6Z" />
        </svg>
      </span>
    );
  }

  if (normalized === "XP_GAINED") {
    return (
      <span className={className} aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M13 2 4 14h6l-1 8 9-12h-6l1-8Z" />
        </svg>
      </span>
    );
  }

  return (
    <span className={className} aria-hidden="true">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M15 17h5l-1.4-1.4A2 2 0 0 1 18 14.2V11a6 6 0 1 0-12 0v3.2a2 2 0 0 1-.6 1.4L4 17h5" />
        <path d="M10 21a2 2 0 0 0 4 0" />
      </svg>
    </span>
  );
}

export function NotificationsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<NotificationFilter>("ALL");

  const notificationsQuery = useQuery({
    queryKey: ["notifications"],
    queryFn: getNotifications
  });

  const markReadMutation = useMutation({
    mutationFn: markNotificationRead,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["notifications"] }),
        queryClient.invalidateQueries({ queryKey: ["notifications-unread-count"] })
      ]);
    }
  });

  const markAllReadMutation = useMutation({
    mutationFn: markAllNotificationsRead,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["notifications"] }),
        queryClient.invalidateQueries({ queryKey: ["notifications-unread-count"] })
      ]);
    }
  });

  const deleteNotificationMutation = useMutation({
    mutationFn: deleteNotification,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["notifications"] }),
        queryClient.invalidateQueries({ queryKey: ["notifications-unread-count"] })
      ]);
    }
  });

  const notifications = notificationsQuery.data ?? [];
  const unreadCount = notifications.filter((notification) => !notification.isRead).length;
  const visibleNotifications = useMemo(
    () => (filter === "UNREAD" ? notifications.filter((notification) => !notification.isRead) : notifications),
    [filter, notifications]
  );

  async function openNotification(notification: NotificationItem) {
    if (!notification.isRead) {
      await markReadMutation.mutateAsync(notification.id);
    }
    if (notification.targetUrl) {
      navigate(notification.targetUrl);
    }
  }

  async function removeNotification(notification: NotificationItem) {
    await deleteNotificationMutation.mutateAsync(notification.id);
  }

  return (
    <section className="product-page notifications-page">
      <article className="app-card notifications-shell">
        <div className="notifications-head">
          <div>
            <p className="app-kicker">Центр событий</p>
            <h1>Уведомления</h1>
            <p>Здесь собраны события по достижениям, опыту и активности в блоге.</p>
          </div>
          <button
            type="button"
            className="app-secondary-button notifications-read-all"
            disabled={!unreadCount || markAllReadMutation.isPending}
            onClick={() => markAllReadMutation.mutate()}
          >
            {markAllReadMutation.isPending ? "Отмечаем..." : "Отметить все как прочитанные"}
          </button>
        </div>

        <div className="notifications-toolbar">
          <div className="notifications-filters">
            <button
              type="button"
              className={filter === "ALL" ? "notifications-filter is-active" : "notifications-filter"}
              onClick={() => setFilter("ALL")}
            >
              Все
            </button>
            <button
              type="button"
              className={filter === "UNREAD" ? "notifications-filter is-active" : "notifications-filter"}
              onClick={() => setFilter("UNREAD")}
            >
              Непрочитанные
            </button>
          </div>
          <span className="notifications-summary">
            {unreadCount ? `Новых уведомлений: ${unreadCount}` : "Все уведомления просмотрены"}
          </span>
        </div>

        {notificationsQuery.isLoading ? (
          <div className="notifications-state">Загрузка уведомлений...</div>
        ) : notificationsQuery.isError ? (
          <div className="notifications-state notifications-state-error">
            {getApiErrorMessage(notificationsQuery.error, "Не удалось загрузить уведомления")}
          </div>
        ) : visibleNotifications.length ? (
          <div className="notifications-list">
            {visibleNotifications.map((notification) => (
              <article
                key={notification.id}
                className={notification.isRead ? "notifications-card" : "notifications-card is-unread"}
              >
                <button
                  type="button"
                  className="notifications-card-open"
                  onClick={() => openNotification(notification)}
                >
                  <NotificationIcon type={notification.type} />
                  <div className="notifications-card-copy">
                    <div className="notifications-card-topline">
                      <strong>{notification.title || "Системное уведомление"}</strong>
                      {!notification.isRead ? <span className="notifications-new-badge">Новое</span> : null}
                    </div>
                    <p>{notification.message || "Новое событие в вашем профиле."}</p>
                    <div className="notifications-card-meta">
                      <span>{formatNotificationDate(notification.createdAt)}</span>
                      <span>{notification.isRead ? "Прочитано" : "Ожидает просмотра"}</span>
                    </div>
                  </div>
                </button>
                <button
                  type="button"
                  className="notifications-delete"
                  onClick={() => removeNotification(notification)}
                  aria-label="Удалить уведомление"
                >
                  Удалить
                </button>
              </article>
            ))}
          </div>
        ) : (
          <div className="notifications-empty">
            <strong>Пока нет уведомлений</strong>
            <p>Когда появятся достижения, опыт или реакции в блоге, они будут отображаться здесь.</p>
          </div>
        )}
      </article>
    </section>
  );
}
