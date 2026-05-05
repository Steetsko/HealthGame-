import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  commentOnChallengeDiscussion,
  createChallenge,
  deleteChallenge,
  getChallenge,
  getChallengeDiscussion,
  getCurrentUser,
  getHabitCategories,
  getMyChallenges,
  getPublicChallenges,
  joinChallenge,
  leaveChallenge,
  moderateChallenge,
  moderateComment,
  type ChallengeCreatePayload
} from "../lib/api";
import { ChallengeModal } from "../components/ChallengeModal";
import { getApiErrorMessage } from "../lib/errors";
import { readFileAsDataUrl } from "../lib/fileDataUrl";
import type { Challenge } from "../lib/types";

type ChallengeFormState = {
  name: string;
  description: string;
  categoryId: number;
  goalType: string;
  goalValue: number;
  xpReward: number;
  startDate: string;
  endDate: string;
  imageUrl: string;
};

const GOAL_OPTIONS = [
  { value: "DAYS_COUNT", label: "По количеству дней" },
  { value: "SUM_VALUE", label: "По суммарному значению" },
  { value: "STREAK", label: "По серии без пропусков" }
] as const;

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

function addDaysIso(days: number) {
  const base = new Date();
  const dt = new Date(base.getFullYear(), base.getMonth(), base.getDate() + days);
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, "0");
  const d = String(dt.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function createInitialChallengeForm(categoryId = 1): ChallengeFormState {
  return {
    name: "",
    description: "",
    categoryId,
    goalType: "DAYS_COUNT",
    goalValue: 7,
    xpReward: 120,
    startDate: todayIsoDate(),
    endDate: addDaysIso(14),
    imageUrl: ""
  };
}

function formatChallengeStatus(status: string) {
  switch (status) {
    case "ACTIVE":
      return "Активен";
    case "DRAFT":
      return "В плане";
    case "FINISHED":
      return "Завершён";
    case "COMPLETED":
      return "Завершён";
    case "CANCELLED":
      return "Остановлен";
    default:
      return status;
  }
}

function fallbackDescription(text: string | null | undefined, fallback: string) {
  const normalized = text?.trim();
  return normalized ? normalized : fallback;
}

function getPersonalProgressPercent(challenge: Challenge) {
  return Math.max(0, Math.min(100, Math.round(challenge.completionPercent ?? 0)));
}

function isCompletedChallengeStatus(status: string) {
  return status === "FINISHED" || status === "COMPLETED";
}

function isPersonalChallengeGoalDone(challenge: Challenge) {
  const personalValue = challenge.currentValue ?? 0;
  return getPersonalProgressPercent(challenge) >= 100 || (challenge.goalValue > 0 && personalValue >= challenge.goalValue);
}

function challengeCardClassName(isCompleted: boolean) {
  return [
    "home-challenge-card",
    "challenge-gallery-card",
    isCompleted ? "challenge-gallery-card-completed" : ""
  ].filter(Boolean).join(" ");
}

export function ChallengesPage() {
  const qc = useQueryClient();
  const [selectedChallengeId, setSelectedChallengeId] = useState<number | null>(null);
  const [challengeComment, setChallengeComment] = useState("");
  const [challengeReplyDrafts, setChallengeReplyDrafts] = useState<Record<number, string>>({});
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [challengeImageFileName, setChallengeImageFileName] = useState<string | null>(null);
  const [challengeImageUploadError, setChallengeImageUploadError] = useState<string | null>(null);
  const [challengeSuccessMessage, setChallengeSuccessMessage] = useState<string | null>(null);

  const meQuery = useQuery({ queryKey: ["me"], queryFn: getCurrentUser });
  const categoriesQuery = useQuery({ queryKey: ["habit-categories"], queryFn: getHabitCategories });
  const isAdmin = meQuery.data?.roles?.includes("ROLE_ADMIN") ?? false;
  const categories = categoriesQuery.data ?? [];

  const [challengeForm, setChallengeForm] = useState<ChallengeFormState>(createInitialChallengeForm());

  useEffect(() => {
    if (!categories.length) return;
    setChallengeForm((current) =>
      categories.some((category) => category.id === current.categoryId)
        ? current
        : { ...current, categoryId: categories[0].id }
    );
  }, [categories]);

  const myChallengesQuery = useQuery({ queryKey: ["my-challenges", "expanded"], queryFn: getMyChallenges });
  const publicChallengesQuery = useQuery({
    queryKey: ["public-challenges", "challenges-page"],
    queryFn: () => getPublicChallenges({ page: 0, size: 24 })
  });

  const selectedChallengeIndex = useMemo(
    () => Math.max(0, myChallengesQuery.data?.content.findIndex((item) => item.id === selectedChallengeId) ?? 0),
    [myChallengesQuery.data, selectedChallengeId]
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

  const refreshChallengeCollections = async () => {
    await Promise.all([
      qc.invalidateQueries({ queryKey: ["my-challenges"] }),
      qc.invalidateQueries({ queryKey: ["my-challenges", "expanded"] }),
      qc.invalidateQueries({ queryKey: ["public-challenges"] }),
      qc.invalidateQueries({ queryKey: ["public-challenges", "challenges-page"] })
    ]);
  };

  const leaveChallengeMutation = useMutation({
    mutationFn: leaveChallenge,
    onSuccess: async () => {
      setSelectedChallengeId(null);
      await refreshChallengeCollections();
    }
  });

  const joinChallengeMutation = useMutation({
    mutationFn: joinChallenge,
    onSuccess: async (_, challengeId) => {
      await Promise.all([
        refreshChallengeCollections(),
        qc.invalidateQueries({ queryKey: ["challenge-details", challengeId] })
      ]);
    }
  });

  const createChallengeMutation = useMutation({
    mutationFn: createChallenge,
    onSuccess: async () => {
      setChallengeSuccessMessage("Челлендж создан и уже добавлен в раздел «Мои челленджи».");
      setCreateModalOpen(false);
      setChallengeImageFileName(null);
      setChallengeImageUploadError(null);
      setChallengeForm(createInitialChallengeForm(categories[0]?.id ?? 1));
      await refreshChallengeCollections();
    }
  });

  const deleteChallengeMutation = useMutation({
    mutationFn: deleteChallenge,
    onSuccess: async () => {
      setSelectedChallengeId(null);
      await refreshChallengeCollections();
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

  const moderateChallengeMutation = useMutation({
    mutationFn: ({ challengeId, moderationStatus }: { challengeId: number; moderationStatus: "HIDDEN" | "REMOVED" }) =>
      moderateChallenge(challengeId, { moderationStatus }),
    onSuccess: async () => {
      setSelectedChallengeId(null);
      await refreshChallengeCollections();
    }
  });

  const moderateCommentMutation = useMutation({
    mutationFn: ({ commentId, moderationStatus }: { commentId: number; moderationStatus: "HIDDEN" | "REMOVED" }) =>
      moderateComment(commentId, { moderationStatus }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["challenge-discussion", selectedChallengeId] });
    }
  });

  function openChallengeDetails(challengeId: number) {
    setSelectedChallengeId(challengeId);
    setChallengeComment("");
    setChallengeReplyDrafts({});
  }

  async function handleChallengeImageChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > 1_500_000) {
      setChallengeImageUploadError("Изображение слишком большое. Выберите файл до 1.5 МБ.");
      return;
    }

    try {
      const dataUrl = await readFileAsDataUrl(file);
      setChallengeForm((current) => ({ ...current, imageUrl: dataUrl }));
      setChallengeImageFileName(file.name);
      setChallengeImageUploadError(null);
    } catch {
      setChallengeImageUploadError("Не удалось прочитать изображение с компьютера.");
    }
  }

  function submitCreateChallenge(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setChallengeSuccessMessage(null);

    const payload: ChallengeCreatePayload = {
      name: challengeForm.name.trim(),
      description: challengeForm.description.trim(),
      startDate: challengeForm.startDate,
      endDate: challengeForm.endDate,
      goalType: challengeForm.goalType,
      goalValue: challengeForm.goalValue,
      xpReward: challengeForm.xpReward,
      isPublic: true,
      coverImageUrl: challengeForm.imageUrl.trim() || undefined,
      targets: [{ targetKind: "CATEGORY", categoryId: challengeForm.categoryId }]
    };

    createChallengeMutation.mutate(payload);
  }

  function submitChallengeComment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedChallengeId || !challengeComment.trim()) return;
    commentOnChallengeMutation.mutate({ challengeId: selectedChallengeId, payload: { text: challengeComment.trim() } });
  }

  const myChallenges = myChallengesQuery.data?.content ?? [];
  const publicChallenges = (publicChallengesQuery.data?.content ?? []).filter((challenge) => challenge.status === "ACTIVE");
  const challengeOwnerId = challengeDetailsQuery.data?.creatorId ?? null;
  const canDeleteSelectedChallenge = challengeOwnerId != null && challengeOwnerId === meQuery.data?.id;

  return (
    <section className="product-page home-stage">
      <article className="home-hero-card home-hero-card-simple">
        <div className="home-hero-copy">
          <p className="app-kicker">Челленджи</p>
          <h1>Коллекция челленджей, которые помогают держать общий темп и создавать свои маршруты роста.</h1>
          <p>
            Здесь собраны ваши текущие челленджи, открытая витрина новых сценариев и быстрый вход
            в создание собственного челленджа с наградой, датами и обложкой.
          </p>
          <div className="challenge-hero-actions">
            <button type="button" className="app-primary-button" onClick={() => setCreateModalOpen(true)}>
              Создать свой челлендж
            </button>
          </div>
        </div>

        <div className="home-hero-grid">
          <div className="home-stat-card">
            <span>Мои челленджи</span>
            <strong>{myChallenges.length}</strong>
          </div>
          <div className="home-stat-card">
            <span>Открытые челленджи</span>
            <strong>{publicChallenges.length}</strong>
          </div>
          <div className="home-stat-card home-stat-card-wide">
            <span>Что внутри</span>
            <strong>Участники, цель, XP-награда, обсуждение и понятная точка входа в каждый челлендж.</strong>
          </div>
        </div>
      </article>

      <article className="app-card home-section-card">
        <div className="card-head card-head-spread">
          <div>
            <p className="app-kicker">Мои челленджи</p>
            <h2>Челленджи, в которых вы уже держите темп</h2>
          </div>
          <Link to="/home" className="app-secondary-button">Вернуться к обзору</Link>
        </div>

        {challengeSuccessMessage ? <p className="app-feedback app-feedback-success">{challengeSuccessMessage}</p> : null}

        <div className="challenge-gallery-grid">
          {myChallenges.map((challenge) => {
            const challengeCompleted = isPersonalChallengeGoalDone(challenge) || isCompletedChallengeStatus(challenge.status);
            const completionResult = challenge.xpReward > 0 ? `+${challenge.xpReward} XP` : "Личная цель выполнена";
            return (
            <button
              key={challenge.id}
              type="button"
              className={challengeCardClassName(challengeCompleted)}
              onClick={() => openChallengeDetails(challenge.id)}
            >
              <div className="challenge-list-head">
                <strong className="challenge-card-title">{challenge.name}</strong>
                <span className={`soft-chip challenge-status-chip${challengeCompleted ? " challenge-completed-badge" : ""}`}>
                  {challengeCompleted ? "Выполнено" : formatChallengeStatus(challenge.status)}
                </span>
              </div>
              <p>{fallbackDescription(challenge.description, "У этого челленджа уже есть цель, организатор и понятный ритм участия.")}</p>
              <span className="challenge-list-meta">
                Участников: {challenge.participantCount ?? 0} • Цель: {challenge.goalValue} • XP: {challenge.xpReward}
              </span>
              {challengeCompleted ? (
                <div className="challenge-completed-result">
                  <span>Цель закрыта</span>
                  <strong>{completionResult}</strong>
                  {challenge.xpReward > 0 ? <small>Личная цель выполнена</small> : null}
                </div>
              ) : null}
              {challenge.coverImageUrl ? (
                <div className={`challenge-card-media${challengeCompleted ? " challenge-card-media-completed" : ""}`}>
                  <img src={challenge.coverImageUrl} alt={challenge.name} className="challenge-card-image" />
                  {challengeCompleted ? <span className="challenge-card-image-note">Личная цель выполнена</span> : null}
                </div>
              ) : null}
              <div className="challenge-gallery-cta">{challengeCompleted ? "Посмотреть итоги" : "Открыть детали"}</div>
            </button>
            );
          })}
          {!myChallenges.length ? (
            <div className="challenge-empty-state">
              <strong>Пока у вас нет собственных челленджей.</strong>
              <p>Создайте первый челлендж и соберите вокруг него участников, цель и XP-награду.</p>
            </div>
          ) : null}
        </div>
      </article>

      <article className="app-card home-section-card">
        <div className="card-head card-head-spread">
          <div>
            <p className="app-kicker">Публичные челленджи</p>
            <h2>Открытые челленджи, к которым можно присоединиться прямо сейчас</h2>
          </div>
        </div>

        <div className="challenge-gallery-grid">
          {publicChallenges.map((challenge) => (
            <button
              key={challenge.id}
              type="button"
              className="home-challenge-card challenge-gallery-card"
              onClick={() => openChallengeDetails(challenge.id)}
            >
              <div className="challenge-list-head">
                <strong>{challenge.name}</strong>
                <span className="soft-chip challenge-status-chip">{formatChallengeStatus(challenge.status)}</span>
              </div>
              <p>{fallbackDescription(challenge.description, "Подключайтесь к челленджу и проходите его вместе с другими участниками.")}</p>
              <span className="challenge-list-meta">
                Участников: {challenge.participantCount ?? 0} • Цель: {challenge.goalValue} • XP: {challenge.xpReward}
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
        joinError={
          joinChallengeMutation.isError
            ? getApiErrorMessage(joinChallengeMutation.error, "Не удалось присоединиться к челленджу.")
            : null
        }
        leavePending={leaveChallengeMutation.isPending}
        leaveError={
          leaveChallengeMutation.isError
            ? getApiErrorMessage(leaveChallengeMutation.error, "Не удалось выйти из челленджа.")
            : null
        }
        deletePending={deleteChallengeMutation.isPending}
        deleteError={
          deleteChallengeMutation.isError
            ? getApiErrorMessage(deleteChallengeMutation.error, "Не удалось удалить челлендж.")
            : null
        }
        onDelete={canDeleteSelectedChallenge ? () => selectedChallengeId && deleteChallengeMutation.mutate(selectedChallengeId) : undefined}
        onLeave={() => challengeDetailsQuery.data && leaveChallengeMutation.mutate(challengeDetailsQuery.data.id)}
        replyDrafts={challengeReplyDrafts}
        setReplyDrafts={setChallengeReplyDrafts}
        onClose={() => {
          setSelectedChallengeId(null);
          setChallengeComment("");
        }}
        onJoin={() => challengeDetailsQuery.data && joinChallengeMutation.mutate(challengeDetailsQuery.data.id)}
        onSubmitDiscussion={submitChallengeComment}
        onReply={(payload) => selectedChallengeId && commentOnChallengeMutation.mutate({ challengeId: selectedChallengeId, payload })}
        isAdmin={isAdmin}
        onHideChallenge={() =>
          challengeDetailsQuery.data && moderateChallengeMutation.mutate({ challengeId: challengeDetailsQuery.data.id, moderationStatus: "HIDDEN" })
        }
        onRemoveChallenge={() =>
          challengeDetailsQuery.data && moderateChallengeMutation.mutate({ challengeId: challengeDetailsQuery.data.id, moderationStatus: "REMOVED" })
        }
        onHideComment={(commentId) => moderateCommentMutation.mutate({ commentId, moderationStatus: "HIDDEN" })}
        onRemoveComment={(commentId) => moderateCommentMutation.mutate({ commentId, moderationStatus: "REMOVED" })}
      />

      {createModalOpen ? (
        <div className="overlay-backdrop" role="dialog" aria-modal="true" onClick={() => setCreateModalOpen(false)}>
          <div className="overlay-panel challenge-create-modal" onClick={(event) => event.stopPropagation()}>
            <button type="button" className="overlay-close" onClick={() => setCreateModalOpen(false)} aria-label="Закрыть окно">
              ×
            </button>

            <div className="challenge-create-head">
              <p className="app-kicker">Новый челлендж</p>
              <h2>Создать свой челлендж</h2>
              <p>Соберите название, цель, XP-награду, даты и обложку. После сохранения челлендж сразу появится в вашем списке.</p>
            </div>

            <form className="challenge-create-form" onSubmit={submitCreateChallenge}>
              <label className="app-field challenge-create-form-wide">
                <span>Название челленджа</span>
                <input
                  value={challengeForm.name}
                  onChange={(event) => setChallengeForm((current) => ({ ...current, name: event.target.value }))}
                  placeholder="Например: 7 дней утреннего ритма"
                  required
                />
              </label>

              <label className="app-field challenge-create-form-wide">
                <span>Описание</span>
                <textarea
                  value={challengeForm.description}
                  onChange={(event) => setChallengeForm((current) => ({ ...current, description: event.target.value }))}
                  placeholder="Объясните, зачем нужен челлендж и какой темп вы хотите собрать."
                  rows={4}
                />
              </label>

              <label className="app-field">
                <span>Категория</span>
                <select
                  className="app-select"
                  value={challengeForm.categoryId}
                  onChange={(event) => setChallengeForm((current) => ({ ...current, categoryId: Number(event.target.value) }))}
                >
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="app-field">
                <span>Цель</span>
                <input
                  type="number"
                  min={1}
                  value={challengeForm.goalValue}
                  onChange={(event) => setChallengeForm((current) => ({ ...current, goalValue: Number(event.target.value) || 1 }))}
                  required
                />
              </label>

              <label className="app-field">
                <span>Награда XP</span>
                <input
                  type="number"
                  min={10}
                  value={challengeForm.xpReward}
                  onChange={(event) => setChallengeForm((current) => ({ ...current, xpReward: Number(event.target.value) || 10 }))}
                  required
                />
              </label>

              <label className="app-field">
                <span>Тип цели</span>
                <select
                  className="app-select"
                  value={challengeForm.goalType}
                  onChange={(event) => setChallengeForm((current) => ({ ...current, goalType: event.target.value }))}
                >
                  {GOAL_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="app-field">
                <span>Дата начала</span>
                <input
                  type="date"
                  value={challengeForm.startDate}
                  onChange={(event) => setChallengeForm((current) => ({ ...current, startDate: event.target.value }))}
                  required
                />
              </label>

              <label className="app-field">
                <span>Дата окончания</span>
                <input
                  type="date"
                  value={challengeForm.endDate}
                  onChange={(event) => setChallengeForm((current) => ({ ...current, endDate: event.target.value }))}
                  required
                />
              </label>

              <label className="app-field challenge-create-form-wide">
                <span>Ссылка на изображение</span>
                <input
                  value={challengeForm.imageUrl}
                  onChange={(event) => setChallengeForm((current) => ({ ...current, imageUrl: event.target.value }))}
                  placeholder="https://example.com/challenge-cover.jpg"
                />
              </label>

              <label className="app-field settings-file-field challenge-create-form-wide">
                <span>Или загрузите фото с компьютера</span>
                <div className="blog-file-dropzone-row">
                  <label className="blog-file-button">
                    <input type="file" accept="image/*" onChange={handleChallengeImageChange} />
                    <span className="blog-file-button-icon" aria-hidden="true">＋</span>
                    <span>Добавить фото</span>
                  </label>
                  <span className="blog-file-name">{challengeImageFileName || "Файл не выбран"}</span>
                </div>
                <small>Поддерживаются изображения до 1.5 МБ.</small>
              </label>

              {challengeForm.imageUrl ? (
                <div className="blog-image-preview challenge-create-preview challenge-create-form-wide">
                  <div className="blog-image-preview-media">
                    <img src={challengeForm.imageUrl} alt="Предпросмотр обложки челленджа" className="blog-image-preview-image" />
                  </div>
                  <div className="blog-image-preview-copy">
                    <strong>Обложка готова</strong>
                    <p>Можно оставить её, заменить ссылкой или загрузить другое изображение.</p>
                  </div>
                </div>
              ) : null}

              <div className="challenge-create-actions challenge-create-form-wide">
                <button className="app-primary-button" type="submit" disabled={createChallengeMutation.isPending}>
                  {createChallengeMutation.isPending ? "Создаём челлендж..." : "Создать челлендж"}
                </button>
                <button type="button" className="app-secondary-button" onClick={() => setCreateModalOpen(false)}>
                  Отменить
                </button>
              </div>

              {challengeImageUploadError ? <p className="app-feedback app-feedback-error challenge-create-form-wide">{challengeImageUploadError}</p> : null}
              {createChallengeMutation.isError ? (
                <p className="app-feedback app-feedback-error challenge-create-form-wide">
                  {getApiErrorMessage(createChallengeMutation.error, "Не удалось создать челлендж. Проверьте поля и попробуйте ещё раз.")}
                </p>
              ) : null}
            </form>
          </div>
        </div>
      ) : null}
    </section>
  );
}
