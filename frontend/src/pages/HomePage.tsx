import { ChangeEvent, FormEvent, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  commentOnChallengeDiscussion,
  commentOnCommunityPost,
  createCommunityPost,
  getChallenge,
  getChallengeDiscussion,
  getCommunityPosts,
  getCurrentUser,
  getPublicChallenges,
  joinChallenge,
  moderateChallenge,
  moderateComment,
  moderatePost,
  reactToCommunityPost
} from "../lib/api";
import { ChallengeModal } from "../components/ChallengeModal";
import { CommunityCommentTree } from "../components/CommunityCommentTree";
import { getApiErrorMessage } from "../lib/errors";
import { readFileAsDataUrl } from "../lib/fileDataUrl";

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
      return "Активен";
    case "DRAFT":
      return "В плане";
    case "FINISHED":
      return "Завершен";
    case "CANCELLED":
      return "Остановлен";
    default:
      return status;
  }
}

export function HomePage() {
  const qc = useQueryClient();
  const [postsPage, setPostsPage] = useState(0);
  const [selectedChallengeId, setSelectedChallengeId] = useState<number | null>(null);
    const [postImageUploadError, setPostImageUploadError] = useState<string | null>(null);
    const [postSuccessMessage, setPostSuccessMessage] = useState<string | null>(null);
    const [postDraft, setPostDraft] = useState({ text: "", imageUrl: "" });
    const [postImageFileName, setPostImageFileName] = useState<string | null>(null);
  const [postCommentDrafts, setPostCommentDrafts] = useState<Record<number, string>>({});
  const [postReplyDrafts, setPostReplyDrafts] = useState<Record<number, string>>({});
  const [challengeComment, setChallengeComment] = useState("");
  const [challengeReplyDrafts, setChallengeReplyDrafts] = useState<Record<number, string>>({});
  const [revealedModeratedPosts, setRevealedModeratedPosts] = useState<Record<number, boolean>>({});

  const meQuery = useQuery({ queryKey: ["me"], queryFn: getCurrentUser });
  const publicChallengesQuery = useQuery({
    queryKey: ["public-challenges", "home"],
    queryFn: () => getPublicChallenges({ page: 0, size: 12 })
  });
  const postsQuery = useQuery({
    queryKey: ["community-posts", postsPage],
    queryFn: () => getCommunityPosts({ page: postsPage, size: 15 })
  });

  const isAdmin = meQuery.data?.roles?.includes("ROLE_ADMIN") ?? false;
  const selectedChallengeIndex = useMemo(
    () => Math.max(0, (publicChallengesQuery.data?.content ?? []).findIndex((item) => item.id === selectedChallengeId)),
    [publicChallengesQuery.data, selectedChallengeId]
  );

  const latestPublicChallenges = useMemo(
    () =>
      [...(publicChallengesQuery.data?.content ?? [])]
        .filter((challenge) => challenge.status === "ACTIVE")
        .sort((left, right) => right.id - left.id)
        .slice(0, 4),
    [publicChallengesQuery.data]
  );

  const challengeDetailsQuery = useQuery({
    queryKey: ["challenge-details", selectedChallengeId],
    queryFn: () => getChallenge(selectedChallengeId!),
    enabled: Boolean(selectedChallengeId)
  });

  const challengeDiscussionQuery = useQuery({
    queryKey: ["challenge-discussion", selectedChallengeId],
    queryFn: () => getChallengeDiscussion(selectedChallengeId!),
    enabled: Boolean(selectedChallengeId)
  });

  const createPostMutation = useMutation({
    mutationFn: createCommunityPost,
      onSuccess: async () => {
        setPostDraft({ text: "", imageUrl: "" });
        setPostImageFileName(null);
        setPostImageUploadError(null);
        setPostSuccessMessage("Пост опубликован и уже появился в ленте.");
        await qc.invalidateQueries({ queryKey: ["community-posts"] });
    }
  });

  const commentOnPostMutation = useMutation({
    mutationFn: ({ postId, payload }: { postId: number; payload: { text: string; parentCommentId?: number | null } }) =>
      commentOnCommunityPost(postId, payload),
    onSuccess: async (_, variables) => {
      setPostCommentDrafts((current) => ({ ...current, [variables.postId]: "" }));
      await qc.invalidateQueries({ queryKey: ["community-posts"] });
    }
  });

  const reactionMutation = useMutation({
    mutationFn: ({ postId, reaction }: { postId: number; reaction: "like" | "fire" | "clap" }) =>
      reactToCommunityPost(postId, { reaction }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["community-posts"] });
    }
  });

  const joinChallengeMutation = useMutation({
    mutationFn: joinChallenge,
    onSuccess: async () => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["public-challenges"] }),
        qc.invalidateQueries({ queryKey: ["challenge-details", selectedChallengeId] })
      ]);
    }
  });

  const commentOnChallengeMutation = useMutation({
    mutationFn: ({ challengeId, payload }: { challengeId: number; payload: { text: string; parentCommentId?: number | null } }) =>
      commentOnChallengeDiscussion(challengeId, payload),
    onSuccess: async () => {
      setChallengeComment("");
      await qc.invalidateQueries({ queryKey: ["challenge-discussion", selectedChallengeId] });
    }
  });

  const moderatePostMutation = useMutation({
    mutationFn: ({ postId, moderationStatus }: { postId: number; moderationStatus: "HIDDEN" | "REMOVED" }) =>
      moderatePost(postId, { moderationStatus }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["community-posts"] });
    }
  });

  const moderateCommentMutation = useMutation({
    mutationFn: ({ commentId, moderationStatus }: { commentId: number; moderationStatus: "HIDDEN" | "REMOVED" }) =>
      moderateComment(commentId, { moderationStatus }),
    onSuccess: async () => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["community-posts"] }),
        qc.invalidateQueries({ queryKey: ["challenge-discussion", selectedChallengeId] })
      ]);
    }
  });

  const moderateChallengeMutation = useMutation({
    mutationFn: ({ challengeId, moderationStatus }: { challengeId: number; moderationStatus: "HIDDEN" | "REMOVED" }) =>
      moderateChallenge(challengeId, { moderationStatus }),
    onSuccess: async () => {
      setSelectedChallengeId(null);
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["public-challenges"] }),
        qc.invalidateQueries({ queryKey: ["challenge-details"] })
      ]);
    }
  });

  async function handlePostImageFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > 1_500_000) {
      setPostImageUploadError("Изображение слишком большое. Выберите файл до 1.5 MB.");
      return;
    }
    try {
      const dataUrl = await readFileAsDataUrl(file);
      setPostDraft((current) => ({ ...current, imageUrl: dataUrl }));
      setPostImageFileName(file.name);
      setPostImageUploadError(null);
    } catch {
      setPostImageUploadError("Не удалось прочитать изображение с компьютера.");
    }
  }

  function submitPost(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = postDraft.text.trim();
    if (!text) return;
    setPostSuccessMessage(null);
    createPostMutation.mutate({
      text,
      imageUrl: postDraft.imageUrl.trim() || undefined
    });
  }

  function submitPostComment(postId: number) {
    const text = (postCommentDrafts[postId] ?? "").trim();
    if (!text) return;
    commentOnPostMutation.mutate({ postId, payload: { text } });
  }

  function submitChallengeComment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedChallengeId || !challengeComment.trim()) return;
    commentOnChallengeMutation.mutate({
      challengeId: selectedChallengeId,
      payload: { text: challengeComment.trim() }
    });
  }

  return (
    <section className="product-page home-stage">
      <article className="home-hero-card home-hero-card-simple">
        <div className="home-hero-copy">
          <p className="app-kicker">Внутренняя главная</p>
          <h1>Публичные челленджи, блог сообщества и общий ритм в одном месте.</h1>
          <p>
            Здесь видна открытая часть приложения: публичные челленджи, публикации пользователей,
            реакции и обсуждения. Это пространство для вдохновения, наблюдения и входа в сообщество.
          </p>
        </div>

        <div className="home-hero-grid">
          <div className="home-stat-card">
            <span>Публичные челленджи</span>
            <strong>{latestPublicChallenges.length}</strong>
          </div>
          <div className="home-stat-card">
            <span>Постов на странице</span>
            <strong>{postsQuery.data?.content.length ?? 0}</strong>
          </div>
          <div className="home-stat-card home-stat-card-wide">
            <span>Что внутри</span>
            <strong>Карточки челленджей, реакции, обсуждения и лента с постами по страницам.</strong>
          </div>
        </div>
      </article>

      <article className="app-card home-section-card">
        <div className="card-head card-head-spread">
          <div>
            <p className="app-kicker">Публичные челленджи</p>
            <h2>Несколько открытых челленджей, к которым можно подключиться прямо сейчас</h2>
          </div>
          <Link to="/challenges" className="app-secondary-button">Смотреть больше</Link>
        </div>

        <div className="challenge-gallery-grid challenge-gallery-grid-home">
          {latestPublicChallenges.map((challenge) => (
            <button
              key={challenge.id}
              type="button"
              className="home-challenge-card challenge-gallery-card"
              onClick={() => {
                setSelectedChallengeId(challenge.id);
                setChallengeComment("");
                setChallengeReplyDrafts({});
              }}
            >
              <div className="challenge-list-head">
                <strong>{challenge.name}</strong>
                <span className="soft-chip challenge-status-chip">{formatChallengeStatus(challenge.status)}</span>
              </div>
              <p>{challenge.description}</p>
              <span className="challenge-list-meta">
                Участников: {challenge.participantCount ?? 0} • Цель: {challenge.goalValue}
              </span>
              {challenge.coverImageUrl ? (
                <div className="challenge-card-media">
                  <img src={challenge.coverImageUrl} alt={challenge.name} className="challenge-card-image" />
                </div>
              ) : null}
              <div className="challenge-gallery-cta">Открыть детали</div>
            </button>
          ))}
        </div>
      </article>

      <article className="app-card home-section-card blog-stage-card">
        <div className="card-head card-head-spread blog-stage-head">
          <div>
            <p className="app-kicker">Блог сообщества</p>
            <h2>Пользователи делятся системами, наблюдениями и своими находками</h2>
          </div>
          <div className="blog-pagination-chip">
            Страница {postsPage + 1} из {Math.max(postsQuery.data?.totalPages ?? 1, 1)}
          </div>
        </div>

        <form className="community-compose blog-compose blog-compose-enhanced" onSubmit={submitPost}>
          <label className="blog-compose-field blog-compose-field-text">
            <span>Текст публикации</span>
            <textarea
              value={postDraft.text}
              onChange={(event) => setPostDraft((current) => ({ ...current, text: event.target.value }))}
              placeholder="Поделитесь мыслью, итогом дня или полезной находкой"
              rows={4}
            />
          </label>

          <div className="blog-compose-side">
            <label className="blog-compose-field">
              <span>Ссылка на изображение</span>
              <input
                value={postDraft.imageUrl}
                onChange={(event) => setPostDraft((current) => ({ ...current, imageUrl: event.target.value }))}
                placeholder="https://example.com/photo.jpg"
              />
            </label>

            <label className="app-field settings-file-field blog-file-field blog-file-dropzone">
              <span>Или добавьте фото с компьютера</span>
              <div className="blog-file-dropzone-row">
                <label className="blog-file-button">
                  <input type="file" accept="image/*" onChange={handlePostImageFileChange} />
                  <span className="blog-file-button-icon" aria-hidden="true">＋</span>
                  <span>Добавить фото</span>
                </label>
                <span className="blog-file-name">{postImageFileName || "Файл не выбран"}</span>
              </div>
              <small>Поддерживаются изображения до 1.5 МБ.</small>
            </label>

            <button className="app-primary-button blog-compose-submit" type="submit" disabled={createPostMutation.isPending}>
              {createPostMutation.isPending ? "Публикуем..." : "Опубликовать пост"}
            </button>
          </div>
        </form>

        {postDraft.imageUrl ? (
          <div className="blog-image-preview">
            <div className="blog-image-preview-media">
              <img src={postDraft.imageUrl} alt="Предпросмотр изображения для поста" className="blog-image-preview-image" />
            </div>
            <div className="blog-image-preview-copy">
              <strong>Изображение готово к публикации</strong>
              <p>Можно оставить его, заменить ссылкой или загрузить другой файл.</p>
            </div>
          </div>
        ) : null}

        {postImageUploadError ? <p className="app-feedback app-feedback-error">{postImageUploadError}</p> : null}
        {postSuccessMessage ? <p className="app-feedback app-feedback-success">{postSuccessMessage}</p> : null}
        {createPostMutation.isError ? (
          <p className="app-feedback app-feedback-error">
            {getApiErrorMessage(createPostMutation.error, "Не удалось опубликовать пост.")}
          </p>
        ) : null}
        {postsQuery.isError ? (
          <p className="app-feedback app-feedback-error">
            {getApiErrorMessage(postsQuery.error, "Не удалось загрузить блог сообщества.")}
          </p>
        ) : null}

        <div className="community-feed community-feed-magazine">
          {(postsQuery.data?.content ?? []).map((post) => {
            const postCommentDraft = postCommentDrafts[post.id] ?? "";
            const isHiddenByModeration = post.moderationStatus === "HIDDEN";
            const isRevealed = Boolean(revealedModeratedPosts[post.id]);

            return (
              <article
                key={post.id}
                className={`community-post community-post-magazine ${post.imageUrl ? "community-post-magazine-with-media" : ""}`}
              >
                {post.imageUrl ? (
                  <div className="community-post-media-column">
                    <div className="community-post-media-frame community-post-media-frame-magazine">
                      <img src={post.imageUrl} alt={post.authorName} className="community-post-image community-post-image-magazine" />
                    </div>
                  </div>
                ) : null}

                <div className="community-post-side-column">
                  <div className="community-post-topline community-post-topline-magazine">
                    <div className="community-post-author-group">
                      {post.authorAvatarUrl ? (
                        <img src={post.authorAvatarUrl} alt={post.authorName} className="community-post-avatar community-post-avatar-image" />
                      ) : (
                        <div className="community-post-avatar">{getInitials(post.authorName || post.authorNickname || "HG")}</div>
                      )}
                      <div>
                        <strong>
                          <Link to={`/users/${post.authorId}`}>{post.authorName}</Link>
                        </strong>
                        <p>
                          <Link to={`/users/${post.authorId}`}>@{post.authorNickname}</Link> • {formatDate(post.createdAt)}
                        </p>
                      </div>
                    </div>

                    {isAdmin ? (
                      <div className="inline-actions">
                        <button
                          type="button"
                          className="app-secondary-button"
                          onClick={() => moderatePostMutation.mutate({ postId: post.id, moderationStatus: "HIDDEN" })}
                        >
                          Скрыть
                        </button>
                        <button
                          type="button"
                          className="app-secondary-button"
                          onClick={() => moderatePostMutation.mutate({ postId: post.id, moderationStatus: "REMOVED" })}
                        >
                          Удалить
                        </button>
                      </div>
                    ) : null}
                  </div>

                  <div className="community-post-body-magazine">
                    {isHiddenByModeration ? (
                      <div className="moderation-banner">
                        <strong>Контент скрыт модерацией</strong>
                        <p>{post.moderationNote || "Публикация временно скрыта из-за спорного или нежелательного содержания."}</p>
                        <button
                          type="button"
                          className="app-secondary-button moderation-toggle-button"
                          onClick={() =>
                            setRevealedModeratedPosts((current) => ({
                              ...current,
                              [post.id]: !current[post.id]
                            }))
                          }
                        >
                          {isRevealed ? "Снова скрыть содержимое" : "Показать содержимое"}
                        </button>
                      </div>
                    ) : null}

                    <div className={`moderated-copy-shell ${isHiddenByModeration ? "moderated-copy-shell-hidden community-post-hidden" : ""}`}>
                      <p className={`community-post-caption ${isHiddenByModeration && !isRevealed ? "moderated-copy" : ""}`}>
                        <strong>{post.authorNickname}</strong> {post.text}
                      </p>
                      {isHiddenByModeration && !isRevealed ? <div className="moderated-copy-overlay">Содержимое скрыто до вашего подтверждения</div> : null}
                    </div>

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
                        <span>{post.comments.length} в обсуждении</span>
                      </div>

                      {post.comments.length ? (
                        <CommunityCommentTree
                          comments={post.comments}
                          onReply={(payload) => commentOnPostMutation.mutate({ postId: post.id, payload })}
                          replyDrafts={postReplyDrafts}
                          setReplyDrafts={setPostReplyDrafts}
                          submitLabel={commentOnPostMutation.isPending ? "..." : "Ответить"}
                          pending={commentOnPostMutation.isPending}
                          isAdmin={isAdmin}
                          onHide={(commentId) => moderateCommentMutation.mutate({ commentId, moderationStatus: "HIDDEN" })}
                          onRemove={(commentId) => moderateCommentMutation.mutate({ commentId, moderationStatus: "REMOVED" })}
                          maxVisibleItems={10}
                          showExpandButton
                        />
                      ) : (
                        <p className="empty-copy">Под этой публикацией пока нет комментариев.</p>
                      )}

                      <div className="comment-compose-inline comment-compose-inline-magazine">
                        <input
                          value={postCommentDraft}
                          onChange={(event) => setPostCommentDrafts((current) => ({ ...current, [post.id]: event.target.value }))}
                          placeholder="Добавьте комментарий к посту"
                        />
                        <button
                          type="button"
                          className="app-secondary-button"
                          onClick={() => submitPostComment(post.id)}
                          disabled={commentOnPostMutation.isPending}
                        >
                          Отправить
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}

          {!postsQuery.isPending && !(postsQuery.data?.content.length ?? 0) ? (
            <p className="empty-copy">Пока здесь нет публикаций. Первая запись может быть вашей.</p>
          ) : null}
        </div>

        <div className="blog-pager">
          <button
            type="button"
            className="app-secondary-button"
            onClick={() => setPostsPage((current) => Math.max(0, current - 1))}
            disabled={postsPage === 0}
          >
            Предыдущая страница
          </button>
          <span className="blog-pager-status">
            Показаны посты {(postsPage * 15) + 1}–{(postsPage * 15) + (postsQuery.data?.content.length ?? 0)}
          </span>
          <button
            type="button"
            className="app-secondary-button"
            onClick={() => setPostsPage((current) => current + 1)}
            disabled={postsPage >= Math.max((postsQuery.data?.totalPages ?? 1) - 1, 0)}
          >
            Следующая страница
          </button>
        </div>
      </article>

      <ChallengeModal
        open={Boolean(selectedChallengeId && challengeDetailsQuery.data)}
        challenge={challengeDetailsQuery.data ?? null}
        challengeIndex={selectedChallengeIndex}
        discussion={challengeDiscussionQuery.data ?? []}
        discussionDraft={challengeComment}
        setDiscussionDraft={setChallengeComment}
        discussionError={
          commentOnChallengeMutation.isError
            ? getApiErrorMessage(commentOnChallengeMutation.error, "Не удалось добавить комментарий в обсуждение челленджа.")
            : null
        }
        discussionPending={commentOnChallengeMutation.isPending}
        joinPending={joinChallengeMutation.isPending}
        joinError={joinChallengeMutation.isError ? getApiErrorMessage(joinChallengeMutation.error, "Не удалось присоединиться к челленджу.") : null}
        replyDrafts={challengeReplyDrafts}
        setReplyDrafts={setChallengeReplyDrafts}
        onClose={() => {
          setSelectedChallengeId(null);
          setChallengeComment("");
        }}
        onJoin={() => challengeDetailsQuery.data && joinChallengeMutation.mutate(challengeDetailsQuery.data.id)}
        onSubmitDiscussion={submitChallengeComment}
        onReply={(payload) => {
          if (!selectedChallengeId) return;
          commentOnChallengeMutation.mutate({ challengeId: selectedChallengeId, payload });
        }}
        isAdmin={isAdmin}
        onHideChallenge={() => challengeDetailsQuery.data && moderateChallengeMutation.mutate({ challengeId: challengeDetailsQuery.data.id, moderationStatus: "HIDDEN" })}
        onRemoveChallenge={() => challengeDetailsQuery.data && moderateChallengeMutation.mutate({ challengeId: challengeDetailsQuery.data.id, moderationStatus: "REMOVED" })}
        onHideComment={(commentId) => moderateCommentMutation.mutate({ commentId, moderationStatus: "HIDDEN" })}
        onRemoveComment={(commentId) => moderateCommentMutation.mutate({ commentId, moderationStatus: "REMOVED" })}
      />
    </section>
  );
}
