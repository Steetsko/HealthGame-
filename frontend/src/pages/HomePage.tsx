import { FormEvent, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  commentOnChallengeDiscussion,
  commentOnCommunityPost,
  createCommunityPost,
  deleteChallenge,
  getAchievements,
  getChallenge,
  getChallengeDiscussion,
  getCommunityPosts,
  getCurrentUser,
  getPublicChallenges,
  joinChallenge,
  toggleCommunityPostLike,
  type CommunityCommentPayload,
  type CommunityPostPayload
} from "../lib/api";
import { getApiErrorMessage } from "../lib/errors";
import { ChallengeModal } from "../components/ChallengeModal";
import { CommunityCommentTree } from "../components/CommunityCommentTree";

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("ru-RU", { day: "2-digit", month: "long" });
}

export function HomePage() {
  const qc = useQueryClient();
  const meQuery = useQuery({ queryKey: ["me"], queryFn: getCurrentUser });
  const publicChallengesQuery = useQuery({ queryKey: ["public-challenges", "home"], queryFn: () => getPublicChallenges({ page: 0, size: 12 }) });
  const achievementsQuery = useQuery({ queryKey: ["achievements"], queryFn: getAchievements });
  const postsQuery = useQuery({ queryKey: ["community-posts"], queryFn: getCommunityPosts });

  const [selectedChallengeId, setSelectedChallengeId] = useState<number | null>(null);
  const [challengeComment, setChallengeComment] = useState("");
  const [challengeReplyDrafts, setChallengeReplyDrafts] = useState<Record<number, string>>({});
  const [postDraft, setPostDraft] = useState<CommunityPostPayload>({ text: "", imageUrl: "", visibility: "PUBLIC" });
  const [postCommentDrafts, setPostCommentDrafts] = useState<Record<number, string>>({});
  const [postReplyDrafts, setPostReplyDrafts] = useState<Record<number, string>>({});
  const [postSuccessMessage, setPostSuccessMessage] = useState<string | null>(null);

  const selectedChallengeIndex = useMemo(
    () => Math.max(0, publicChallengesQuery.data?.content.findIndex((item) => item.id === selectedChallengeId) ?? 0),
    [publicChallengesQuery.data, selectedChallengeId]
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

  const joinChallengeMutation = useMutation({
    mutationFn: joinChallenge,
    onSuccess: async (data) => {
      setSelectedChallengeId(data.id);
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["public-challenges"] }),
        qc.invalidateQueries({ queryKey: ["challenge-details", data.id] })
      ]);
    }
  });

  const deleteChallengeMutation = useMutation({
    mutationFn: deleteChallenge,
    onSuccess: async () => {
      setSelectedChallengeId(null);
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["public-challenges"] }),
        qc.invalidateQueries({ queryKey: ["challenge-details"] })
      ]);
    }
  });

  const createPostMutation = useMutation({
    mutationFn: createCommunityPost,
    onSuccess: async () => {
      setPostDraft({ text: "", imageUrl: "", visibility: "PUBLIC" });
      setPostSuccessMessage("Пост опубликован и уже доступен в ленте сообщества.");
      await qc.invalidateQueries({ queryKey: ["community-posts"] });
    }
  });

  const commentOnChallengeMutation = useMutation({
    mutationFn: ({ challengeId, payload }: { challengeId: number; payload: CommunityCommentPayload }) => commentOnChallengeDiscussion(challengeId, payload),
    onSuccess: async () => {
      setChallengeComment("");
      await qc.invalidateQueries({ queryKey: ["challenge-discussion", selectedChallengeId] });
    }
  });

  const commentOnPostMutation = useMutation({
    mutationFn: ({ postId, payload }: { postId: number; payload: CommunityCommentPayload }) => commentOnCommunityPost(postId, payload),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["community-posts"] });
    }
  });

  const likeMutation = useMutation({
    mutationFn: toggleCommunityPostLike,
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["community-posts"] });
    }
  });

  const name = meQuery.data?.firstName || meQuery.data?.nickname || "друг";
  const previewChallenges = publicChallengesQuery.data?.content.slice(0, 3) ?? [];

  function submitChallengeComment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedChallengeId || !challengeComment.trim()) return;
    commentOnChallengeMutation.mutate({ challengeId: selectedChallengeId, payload: { text: challengeComment.trim() } });
  }

  function submitPost(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = postDraft.text.trim();
    if (!text) return;
    setPostSuccessMessage(null);
    createPostMutation.mutate({ text, imageUrl: postDraft.imageUrl?.trim() || undefined, visibility: "PUBLIC" });
  }

  return (
    <section className="product-page home-stage">
      <article className="home-hero-card home-hero-card-simple">
        <div className="home-hero-copy">
          <p className="app-kicker">Внутренняя главная</p>
          <h1>{`${name}, держим курс на стабильный ритм.`}</h1>
          <p>
            Здесь собраны публичные челленджи, лента сообщества и быстрый обзор ваших достижений.
            Это спокойная точка входа в продукт перед переходом в личный кабинет и ежедневный трекер привычек.
          </p>
        </div>
        <div className="home-hero-grid">
          <div className="home-stat-card"><span>Публичные челленджи</span><strong>{publicChallengesQuery.data?.content.length ?? 0}</strong></div>
          <div className="home-stat-card"><span>Мои достижения</span><strong>{achievementsQuery.data?.length ?? 0}</strong></div>
          <div className="home-stat-card home-stat-card-wide"><span>Зачем это пространство</span><strong>План, сообщество и личный прогресс в одном месте.</strong></div>
        </div>
      </article>

      <article className="app-card home-section-card">
        <div className="card-head card-head-spread">
          <div>
            <p className="app-kicker">Публичные челленджи</p>
            <h2>Что можно подхватить прямо сейчас</h2>
          </div>
          <Link to="/challenges" className="app-secondary-button">Смотреть больше</Link>
        </div>

        <div className="challenge-gallery-grid challenge-gallery-grid-preview">
          {previewChallenges.map((challenge) => (
            <button key={challenge.id} type="button" className="home-challenge-card challenge-gallery-card" onClick={() => setSelectedChallengeId(challenge.id)}>
              <div className="challenge-list-head">
                <strong>{challenge.name}</strong>
                <span className="soft-chip">{challenge.status}</span>
              </div>
              <p>{challenge.description}</p>
              <span className="challenge-list-meta">Цель: {challenge.goalValue}</span>
              {challenge.coverImageUrl ? <img src={challenge.coverImageUrl} alt={challenge.name} className="challenge-card-image" /> : null}
              <div className="challenge-gallery-cta">Открыть детали</div>
            </button>
          ))}
        </div>
      </article>

      <article className="app-card home-section-card">
        <div className="card-head card-head-spread">
          <div>
            <p className="app-kicker">Блог сообщества</p>
            <h2>Пользователи делятся ходом недели, находками и личными системами</h2>
          </div>
        </div>

        <form className="community-compose" onSubmit={submitPost}>
          <input
            value={postDraft.text}
            onChange={(event) => setPostDraft((current) => ({ ...current, text: event.target.value }))}
            placeholder="Поделитесь мыслью, наблюдением или коротким итогом дня"
          />
          <input
            value={postDraft.imageUrl ?? ""}
            onChange={(event) => setPostDraft((current) => ({ ...current, imageUrl: event.target.value }))}
            placeholder="Ссылка на изображение для поста"
          />
          <button className="app-primary-button" type="submit" disabled={createPostMutation.isPending}>
            {createPostMutation.isPending ? "Публикуем..." : "Опубликовать пост"}
          </button>
        </form>

        {postSuccessMessage ? <p className="app-feedback app-feedback-success">{postSuccessMessage}</p> : null}
        {createPostMutation.isError ? (
          <p className="app-feedback app-feedback-error">
            {getApiErrorMessage(createPostMutation.error, "Не удалось опубликовать пост.")}
          </p>
        ) : null}

        <div className="community-feed">
          {postsQuery.data?.content.map((post) => (
            <article key={post.id} className="community-post">
              {post.imageUrl ? <img src={post.imageUrl} alt={post.authorName} className="community-post-image" /> : null}
              <div className="community-post-body">
                <div className="community-post-head">
                  <div>
                    <strong>{post.authorName}</strong>
                    <p>@{post.authorNickname} • {formatDate(post.createdAt)}</p>
                  </div>
                </div>
                <p>{post.text}</p>
                <div className="inline-actions">
                  <button type="button" className="app-secondary-button" onClick={() => likeMutation.mutate(post.id)}>
                    {post.likedByCurrentUser ? `Убрать лайк • ${post.likeCount}` : `Лайк • ${post.likeCount}`}
                  </button>
                </div>

                <div className="comment-compose-inline">
                  <input
                    value={postCommentDrafts[post.id] ?? ""}
                    onChange={(event) => setPostCommentDrafts((current) => ({ ...current, [post.id]: event.target.value }))}
                    placeholder="Оставьте комментарий к посту"
                  />
                  <button
                    type="button"
                    className="app-secondary-button"
                    onClick={() => {
                      const text = (postCommentDrafts[post.id] ?? "").trim();
                      if (!text) return;
                      commentOnPostMutation.mutate({ postId: post.id, payload: { text } });
                      setPostCommentDrafts((current) => ({ ...current, [post.id]: "" }));
                    }}
                    disabled={commentOnPostMutation.isPending}
                  >
                    Отправить
                  </button>
                </div>

                {commentOnPostMutation.isError ? (
                  <p className="app-feedback app-feedback-error">
                    {getApiErrorMessage(commentOnPostMutation.error, "Не удалось добавить комментарий к посту.")}
                  </p>
                ) : null}

                {post.comments.length ? (
                  <CommunityCommentTree
                    comments={post.comments}
                    onReply={(payload) => commentOnPostMutation.mutate({ postId: post.id, payload })}
                    replyDrafts={postReplyDrafts}
                    setReplyDrafts={setPostReplyDrafts}
                    submitLabel={commentOnPostMutation.isPending ? "..." : "Ответить"}
                    pending={commentOnPostMutation.isPending}
                  />
                ) : (
                  <p className="empty-copy">Пока под этим постом нет комментариев. Можно начать обсуждение первой.</p>
                )}
              </div>
            </article>
          ))}
        </div>
      </article>

      <ChallengeModal
        open={Boolean(selectedChallengeId && challengeDetailsQuery.data)}
        challenge={challengeDetailsQuery.data ?? null}
        challengeIndex={selectedChallengeIndex}
        discussion={challengeDiscussionQuery.data ?? []}
        discussionDraft={challengeComment}
        setDiscussionDraft={setChallengeComment}
        discussionError={commentOnChallengeMutation.isError ? getApiErrorMessage(commentOnChallengeMutation.error, "Не удалось добавить комментарий в обсуждение челленджа.") : null}
        discussionPending={commentOnChallengeMutation.isPending}
        joinPending={joinChallengeMutation.isPending}
        joinError={joinChallengeMutation.isError ? getApiErrorMessage(joinChallengeMutation.error, "Не удалось присоединиться к челленджу.") : null}
        deletePending={deleteChallengeMutation.isPending}
        deleteError={deleteChallengeMutation.isError ? getApiErrorMessage(deleteChallengeMutation.error, "Не удалось удалить челлендж.") : null}
        onDelete={
          challengeDetailsQuery.data?.currentUserParticipantRole === "ORGANIZER"
            ? () => {
                if (!challengeDetailsQuery.data) return;
                if (!confirm("Удалить челлендж? Это действие нельзя отменить.")) return;
                deleteChallengeMutation.mutate(challengeDetailsQuery.data.id);
              }
            : undefined
        }
        replyDrafts={challengeReplyDrafts}
        setReplyDrafts={setChallengeReplyDrafts}
        onClose={() => {
          setSelectedChallengeId(null);
          setChallengeComment("");
        }}
        onJoin={() => challengeDetailsQuery.data && joinChallengeMutation.mutate(challengeDetailsQuery.data.id)}
        onSubmitDiscussion={submitChallengeComment}
        onReply={(payload) => selectedChallengeId && commentOnChallengeMutation.mutate({ challengeId: selectedChallengeId, payload })}
      />
    </section>
  );
}
