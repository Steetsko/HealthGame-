import { useMemo, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  blockUserAsAdmin,
  getCurrentUser,
  getUserPosts,
  getUserProfile,
  reactToCommunityPost,
  unblockUserAsAdmin
} from "../lib/api";
import { CommunityCommentTree } from "../components/CommunityCommentTree";
import type { CommunityPost, PublicUserChallenge } from "../lib/types";
import { getApiErrorMessage } from "../lib/errors";

const REACTIONS = [
  { key: "like", icon: "🤍", activeIcon: "❤️", label: "Нравится" },
  { key: "fire", icon: "🔥", activeIcon: "🔥", label: "Огонь" },
  { key: "clap", icon: "👏", activeIcon: "👏", label: "Аплодисменты" }
] as const;

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("ru-RU", { day: "2-digit", month: "long" });
}

function getInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function formatChallengeStatus(status: string) {
  switch (status) {
    case "ACTIVE":
      return "Активный";
    case "FINISHED":
      return "Завершён";
    case "CANCELLED":
      return "Остановлен";
    case "DRAFT":
      return "Черновик";
    default:
      return status || "Без статуса";
  }
}

function formatParticipantRole(role: string) {
  switch (role) {
    case "ORGANIZER":
      return "Организатор";
    case "PARTICIPANT":
      return "Участник";
    default:
      return role || "Участник";
  }
}

function formatParticipantStatus(status: string) {
  switch (status) {
    case "ACCEPTED":
      return "Участвует";
    case "LEFT":
      return "Завершил участие";
    default:
      return status || "Без статуса";
  }
}

function getXpProgress(level: number, xp: number, nextLevelXp: number) {
  const previousLevelXp = Math.max(0, (level - 1) * 120);
  const span = Math.max(1, nextLevelXp - previousLevelXp);
  return Math.max(0, Math.min(100, Math.round(((xp - previousLevelXp) / span) * 100)));
}

function ChallengeHistoryGroup({
  title,
  kicker,
  challenges,
  visibleCount,
  onShowMore
}: {
  title: string;
  kicker: string;
  challenges: PublicUserChallenge[];
  visibleCount: number;
  onShowMore: () => void;
}) {
  if (!challenges.length) {
    return (
      <div className="user-profile-challenge-group">
        <div className="card-head card-head-spread user-profile-subhead">
          <div>
            <p className="app-kicker">{kicker}</p>
            <h3>{title}</h3>
          </div>
        </div>
        <p className="empty-copy">Пока здесь нет челленджей для показа.</p>
      </div>
    );
  }

  return (
    <div className="user-profile-challenge-group">
      <div className="card-head card-head-spread user-profile-subhead">
        <div>
          <p className="app-kicker">{kicker}</p>
          <h3>{title}</h3>
        </div>
        <div className="blog-pagination-chip">{challenges.length}</div>
      </div>

      <div className="challenge-gallery-grid challenge-gallery-grid-home user-profile-challenges-grid">
        {challenges.slice(0, visibleCount).map((challenge) => (
          <article key={challenge.id} className="home-challenge-card challenge-gallery-card user-profile-challenge-card">
            <div className="challenge-list-head">
              <strong>{challenge.name || "Челлендж без названия"}</strong>
              <span className="soft-chip challenge-status-chip">{formatChallengeStatus(challenge.status)}</span>
            </div>
            <p>{challenge.description || "У этого челленджа пока нет описания, но участие уже отмечено в публичном профиле."}</p>
            <div className="user-profile-challenge-meta">
              <span>{formatParticipantRole(challenge.participantRole)}</span>
              <span>{formatParticipantStatus(challenge.participantStatus)}</span>
            </div>
            <span className="challenge-list-meta">
              Участников: {challenge.participantCount ?? 0} • Цель: {challenge.goalValue ?? 0}
            </span>
            {challenge.coverImageUrl ? (
              <div className="challenge-card-media">
                <img src={challenge.coverImageUrl} alt={challenge.name || "Обложка челленджа"} className="challenge-card-image" />
              </div>
            ) : null}
          </article>
        ))}
      </div>

      {visibleCount < challenges.length ? (
        <button type="button" className="app-secondary-button user-profile-show-more" onClick={onShowMore}>
          Показать ещё
        </button>
      ) : null}
    </div>
  );
}

export function UserProfilePage() {
  const params = useParams();
  const userId = Number(params.id);
  const [activeVisibleCount, setActiveVisibleCount] = useState(3);
  const [finishedVisibleCount, setFinishedVisibleCount] = useState(3);
  const [replyDrafts, setReplyDrafts] = useState<Record<number, string>>({});

  const meQuery = useQuery({ queryKey: ["me"], queryFn: getCurrentUser });
  const profileQuery = useQuery({
    queryKey: ["user-profile", userId],
    queryFn: () => getUserProfile(userId),
    enabled: Number.isFinite(userId) && userId > 0,
    refetchOnWindowFocus: false
  });
  const postsQuery = useQuery({
    queryKey: ["user-posts", userId],
    queryFn: () => getUserPosts(userId, { page: 0, size: 15 }),
    enabled: Number.isFinite(userId) && userId > 0,
    refetchOnWindowFocus: false
  });

  const isAdmin = meQuery.data?.roles?.includes("ROLE_ADMIN") ?? false;
  const isCurrentUser = meQuery.data?.id === userId;

  const profile = profileQuery.data;
  const posts: CommunityPost[] = Array.isArray(postsQuery.data?.content) ? postsQuery.data!.content : [];

  const challengeHistory = Array.isArray(profile?.challengeHistory) ? profile!.challengeHistory : [];
  const activeChallenges = useMemo(
    () => challengeHistory.filter((challenge) => challenge.status === "ACTIVE"),
    [challengeHistory]
  );
  const finishedChallenges = useMemo(
    () => challengeHistory.filter((challenge) => challenge.status !== "ACTIVE"),
    [challengeHistory]
  );

  const profileName = (profile?.firstName || profile?.nickname || "Пользователь").trim();
  const profileNickname = profile?.nickname || "user";
  const profileInitials = getInitials(profileName || "HG");
  const viewedUserBlocked = String(profile?.status ?? "").toUpperCase() === "BLOCKED";

  const level = profile?.level ?? 1;
  const xp = profile?.xp ?? 0;
  const nextLevelXp = profile?.nextLevelXp ?? 120;
  const streakDays = profile?.streakDays ?? 0;
  const totalCheckins = profile?.totalCheckins ?? 0;
  const xpProgress = getXpProgress(level, xp, nextLevelXp);

  const blockMutation = useMutation({
    mutationFn: () => blockUserAsAdmin(userId, { note: "Блокировка с публичного профиля" }),
    onSuccess: () => profileQuery.refetch()
  });

  const unblockMutation = useMutation({
    mutationFn: () => unblockUserAsAdmin(userId),
    onSuccess: () => profileQuery.refetch()
  });

  const reactionMutation = useMutation({
    mutationFn: ({ postId, reaction }: { postId: number; reaction: "like" | "fire" | "clap" }) =>
      reactToCommunityPost(postId, { reaction }),
    onSuccess: () => postsQuery.refetch()
  });

  if (!Number.isFinite(userId) || userId <= 0) {
    return <Navigate to="/forbidden" replace />;
  }

  if (profileQuery.isLoading) {
    return (
      <section className="product-page user-profile-page">
        <article className="app-card home-section-card">
          <p className="empty-copy">Загружаем профиль участника...</p>
        </article>
      </section>
    );
  }

  if (!profile) {
    return (
      <section className="product-page user-profile-page">
        <article className="app-card home-section-card">
          <p className="app-feedback app-feedback-error">
            {getApiErrorMessage(profileQuery.error, "Не удалось загрузить публичный профиль пользователя.")}
          </p>
        </article>
      </section>
    );
  }

  return (
    <section className="product-page user-profile-page">
      <article className="home-hero-card user-profile-hero user-profile-hero-upgraded">
        <div className="user-profile-hero-main">
          <p className="app-kicker">Публичный профиль</p>

          <div className="user-profile-identity user-profile-identity-upgraded">
            {profile.avatarUrl ? (
              <img src={profile.avatarUrl} alt={profileName} className="user-profile-avatar" />
            ) : (
              <div className="user-profile-avatar user-profile-avatar-fallback">{profileInitials}</div>
            )}

            <div className="user-profile-title-copy user-profile-title-copy-upgraded">
              <h1>{profileName}</h1>
              <div className="user-profile-nickname-row">
                <span className="user-profile-nickname">@{profileNickname}</span>
                <span className="soft-chip">{viewedUserBlocked ? "Профиль ограничен" : "В сообществе"}</span>
              </div>
              <div className="user-profile-level-card">
                <div className="user-profile-level-copy">
                  <span>Уровень {level}</span>
                  <strong>{xp} XP</strong>
                </div>
                <div className="dashboard-inline-progress">
                  <div className="dashboard-inline-progress-bar">
                    <div className="dashboard-inline-progress-fill" style={{ width: `${xpProgress}%` }} />
                  </div>
                  <span>До следующего уровня: {Math.max(0, nextLevelXp - xp)} XP</span>
                </div>
              </div>
            </div>
          </div>

          <div className="inline-actions">
            <Link to="/home" className="app-secondary-button">Вернуться к обзору</Link>
            {isAdmin && !isCurrentUser ? (
              viewedUserBlocked ? (
                <button type="button" className="app-primary-button" onClick={() => unblockMutation.mutate()} disabled={unblockMutation.isPending}>
                  {unblockMutation.isPending ? "Возвращаем доступ..." : "Разблокировать пользователя"}
                </button>
              ) : (
                <button type="button" className="app-primary-button" onClick={() => blockMutation.mutate()} disabled={blockMutation.isPending}>
                  {blockMutation.isPending ? "Блокируем..." : "Заблокировать пользователя"}
                </button>
              )
            ) : null}
          </div>
        </div>

        <div className="home-hero-grid user-profile-stats-grid">
          <div className="home-stat-card user-profile-stat-card user-profile-stat-card-accent">
            <span>Серия без пропусков</span>
            <strong>{streakDays} дн.</strong>
          </div>
          <div className="home-stat-card user-profile-stat-card">
            <span>Достижения</span>
            <strong>{profile.achievements ?? 0}</strong>
          </div>
          <div className="home-stat-card user-profile-stat-card">
            <span>Активные челленджи</span>
            <strong>{profile.activeChallenges ?? 0}</strong>
          </div>
          <div className="home-stat-card user-profile-stat-card">
            <span>Привычки в ритме</span>
            <strong>{profile.activeHabits ?? 0}</strong>
          </div>
          <div className="home-stat-card user-profile-stat-card">
            <span>Отметок выполнения</span>
            <strong>{totalCheckins}</strong>
          </div>
          <div className="home-stat-card user-profile-stat-card user-profile-stat-card-copy">
            <span>Публикации</span>
            <strong>{posts.length > 0 ? `${posts.length} в публичной ленте` : "Пока без публичных постов"}</strong>
          </div>
        </div>
      </article>

      <article className="app-card home-section-card user-profile-challenges-stage">
        <div className="card-head card-head-spread">
          <div>
            <p className="app-kicker">История участия</p>
            <h2>Челленджи, в которых этот участник держал или держит темп</h2>
          </div>
          <div className="blog-pagination-chip">{challengeHistory.length} всего</div>
        </div>

        <div className="user-profile-challenges-stack">
          <ChallengeHistoryGroup
            title="Активные челленджи"
            kicker="Сейчас в работе"
            challenges={activeChallenges}
            visibleCount={activeVisibleCount}
            onShowMore={() => setActiveVisibleCount((current) => current + 3)}
          />

          <ChallengeHistoryGroup
            title="Завершённые и прошлые челленджи"
            kicker="Уже в истории"
            challenges={finishedChallenges}
            visibleCount={finishedVisibleCount}
            onShowMore={() => setFinishedVisibleCount((current) => current + 3)}
          />
        </div>
      </article>

      <article className="app-card home-section-card blog-stage-card user-profile-feed-card">
        <div className="card-head card-head-spread blog-stage-head">
          <div>
            <p className="app-kicker">Лента пользователя</p>
            <h2>Посты, которые формируют его публичную ленту</h2>
          </div>
          <div className="blog-pagination-chip">{posts.length} постов в ленте</div>
        </div>

        {postsQuery.isError ? (
          <p className="app-feedback app-feedback-error">
            {getApiErrorMessage(postsQuery.error, "Не удалось загрузить публикации пользователя.")}
          </p>
        ) : null}

        <div className="community-feed community-feed-magazine">
          {posts.map((post) => {
            const comments = Array.isArray(post.comments) ? post.comments : [];

            return (
              <article
                key={post.id}
                className={`community-post community-post-magazine ${post.imageUrl ? "community-post-magazine-with-media" : ""}`}
              >
                {post.imageUrl ? (
                  <div className="community-post-media-column">
                    <div className="community-post-media-frame community-post-media-frame-magazine">
                      <img src={post.imageUrl} alt={post.authorName || "Пост"} className="community-post-image community-post-image-magazine" />
                    </div>
                  </div>
                ) : null}

                <div className="community-post-side-column">
                  <div className="community-post-topline community-post-topline-magazine">
                    <div className="community-post-author-group">
                      {post.authorAvatarUrl ? (
                        <img src={post.authorAvatarUrl} alt={post.authorName || post.authorNickname} className="community-post-avatar community-post-avatar-image" />
                      ) : (
                        <div className="community-post-avatar">{getInitials(post.authorName || post.authorNickname || "HG")}</div>
                      )}
                      <div>
                        <strong>
                          <Link to={`/users/${post.authorId}`}>{post.authorName || post.authorNickname}</Link>
                        </strong>
                        <p>
                          <Link to={`/users/${post.authorId}`}>@{post.authorNickname}</Link> • {formatDate(post.createdAt)}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="community-post-body-magazine">
                    <p className="community-post-caption">
                      <strong>{post.authorNickname}</strong> {post.text}
                    </p>

                    <div className="community-reaction-row">
                      {REACTIONS.map((reaction) => {
                        const active = post.currentReaction === reaction.key;
                        const count = post.reactionCounts?.[reaction.key] ?? 0;
                        return (
                          <button
                            key={reaction.key}
                            type="button"
                            className={`reaction-button ${active ? "reaction-button-active" : ""}`}
                            onClick={() => reactionMutation.mutate({ postId: post.id, reaction: reaction.key })}
                            disabled={reactionMutation.isPending}
                            aria-label={reaction.label}
                          >
                            <span className="reaction-button-icon">{active ? reaction.activeIcon : reaction.icon}</span>
                            <span>{count}</span>
                          </button>
                        );
                      })}
                    </div>

                    <div className="community-comments-panel">
                      <div className="community-comments-panel-head">
                        <strong>Комментарии</strong>
                        <span>{comments.length} в обсуждении</span>
                      </div>

                      {comments.length ? (
                        <CommunityCommentTree
                          comments={comments}
                          onReply={() => {}}
                          replyDrafts={replyDrafts}
                          setReplyDrafts={setReplyDrafts}
                          submitLabel="Ответить"
                          pending={false}
                          readOnly
                          maxVisibleItems={10}
                          showExpandButton
                        />
                      ) : (
                        <p className="empty-copy">Под этой публикацией пока нет комментариев.</p>
                      )}
                    </div>
                  </div>
                </div>
              </article>
            );
          })}

          {!postsQuery.isPending && !posts.length ? (
            <p className="empty-copy">Пока в публичной ленте этого пользователя тихо. Первый пост появится здесь, когда он чем-то поделится.</p>
          ) : null}
        </div>
      </article>
    </section>
  );
}
