import { FormEvent, type SetStateAction } from "react";
import { Link } from "react-router-dom";
import type { ChallengeDetails, CommunityComment } from "../lib/types";
import { CommunityCommentTree } from "./CommunityCommentTree";

function challengeImage(index: number) {
  const images = [
    "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&w=1400&q=80",
    "https://images.unsplash.com/photo-1490645935967-10de6ba17061?auto=format&fit=crop&w=1400&q=80",
    "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1400&q=80",
    "https://images.unsplash.com/photo-1518611012118-696072aa579a?auto=format&fit=crop&w=1400&q=80"
  ];
  return images[index % images.length];
}

function formatChallengeStatus(status: string) {
  switch (status) {
    case "ACTIVE":
      return "Активный";
    case "DRAFT":
      return "Черновик";
    case "FINISHED":
      return "Завершён";
    case "CANCELLED":
      return "Остановлен";
    default:
      return status;
  }
}

function formatParticipantRole(role: string) {
  switch (role) {
    case "ORGANIZER":
      return "Организатор";
    case "PARTICIPANT":
      return "Участник";
    default:
      return role;
  }
}

function formatGoalType(goalType: string) {
  switch (goalType) {
    case "DAILY":
      return "Ежедневный челлендж";
    case "CUMULATIVE":
      return "Накопительная цель";
    case "PVP":
      return "Соревнование";
    default:
      return "Челлендж прогресса";
  }
}

export function ChallengeModal({
  open,
  challenge,
  challengeIndex,
  discussion,
  discussionDraft,
  setDiscussionDraft,
  discussionError,
  discussionPending,
  joinPending,
  joinError,
  leavePending,
  leaveError,
  onLeave,
  deletePending,
  deleteError,
  onDelete,
  replyDrafts,
  setReplyDrafts,
  onClose,
  onJoin,
  onSubmitDiscussion,
  onReply,
  isAdmin = false,
  onHideChallenge,
  onRemoveChallenge,
  onHideComment,
  onRemoveComment
}: {
  open: boolean;
  challenge: ChallengeDetails | null;
  challengeIndex: number;
  discussion: CommunityComment[];
  discussionDraft: string;
  setDiscussionDraft: (value: string) => void;
  discussionError: string | null;
  discussionPending: boolean;
  joinPending: boolean;
  joinError: string | null;
  leavePending?: boolean;
  leaveError?: string | null;
  onLeave?: () => void;
  deletePending?: boolean;
  deleteError?: string | null;
  onDelete?: () => void;
  replyDrafts: Record<number, string>;
  setReplyDrafts: (value: SetStateAction<Record<number, string>>) => void;
  onClose: () => void;
  onJoin: () => void;
  onSubmitDiscussion: (event: FormEvent<HTMLFormElement>) => void;
  onReply: (payload: { text: string; parentCommentId?: number | null }) => void;
  isAdmin?: boolean;
  onHideChallenge?: () => void;
  onRemoveChallenge?: () => void;
  onHideComment?: (commentId: number) => void;
  onRemoveComment?: (commentId: number) => void;
}) {
  if (!open || !challenge) return null;

  const isParticipant = challenge.currentUserParticipantStatus === "ACCEPTED" || challenge.currentUserParticipantStatus === "INVITED";
  const canLeave = isParticipant && !!onLeave;
  const coverImage = challenge.coverImageUrl || challengeImage(challengeIndex);
  const progressPercent = Math.max(0, Math.min(100, Math.round(challenge.currentUserProgress?.completionPercent ?? 0)));
  const progressValue = challenge.currentUserProgress?.currentValue ?? 0;
  const rewardPoints = challenge.xpReward ?? Math.max(40, challenge.goalValue * 10);
  const userGoalCompleted =
    Boolean(challenge.currentUserProgress?.completedAt) ||
    progressPercent >= 100 ||
    progressValue >= challenge.goalValue;

  return (
    <div className="overlay-backdrop" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="overlay-panel challenge-modal" onClick={(event) => event.stopPropagation()}>
        <button type="button" className="overlay-close" onClick={onClose} aria-label="Закрыть окно">×</button>

        <div className="challenge-modal-cover-wrap">
          <div className="challenge-modal-cover-layout">
            <div className="challenge-modal-cover-copy">
              <div className="challenge-modal-cover-topline">
                <span className="soft-chip challenge-modal-chip">{formatChallengeStatus(challenge.status)}</span>
                <span className="soft-chip challenge-modal-chip">{formatGoalType(challenge.goalType)}</span>
                {userGoalCompleted && isParticipant ? (
                  <span className="soft-chip challenge-modal-chip challenge-modal-chip-success">Цель выполнена для вас</span>
                ) : null}
              </div>
              <h2>{challenge.name}</h2>
              <p>{challenge.description}</p>
              <div className="challenge-modal-progress-ribbon">
                <div>
                  <span>Личный прогресс</span>
                  <strong>{progressPercent}%</strong>
                </div>
                <div>
                  <span>Награда челленджа</span>
                  <strong>{rewardPoints} XP</strong>
                </div>
                <div>
                  <span>Текущий темп</span>
                  <strong>{progressValue} / {challenge.goalValue}</strong>
                </div>
              </div>
            </div>
            <div className="challenge-modal-cover-scene" style={{ backgroundImage: `url(${coverImage})` }}>
              <img src={coverImage} alt={challenge.name} className="challenge-modal-cover" />
            </div>
          </div>
        </div>

        <div className="challenge-modal-grid">
          <section className="challenge-modal-main">
            <div className="challenge-modal-facts">
              <div className="home-stat-card"><span>Участники</span><strong>{challenge.participants.length}</strong></div>
              <div className="home-stat-card"><span>Цель</span><strong>{challenge.goalValue}</strong></div>
              <div className="home-stat-card"><span>Прогресс</span><strong>{progressPercent}%</strong></div>
              <div className="home-stat-card"><span>Награда</span><strong>{rewardPoints} XP</strong></div>
            </div>

            <div className="challenge-modal-section">
              <div className="card-head-inline">
                <div>
                  <p className="app-kicker">Обсуждение</p>
                  <h3>Что пишут участники</h3>
                </div>
              </div>

              <form className="app-form" onSubmit={onSubmitDiscussion}>
                <input value={discussionDraft} onChange={(event) => setDiscussionDraft(event.target.value)} placeholder="Оставьте сообщение для участников" />
                <button className="app-primary-button" type="submit" disabled={discussionPending}>
                  {discussionPending ? "Отправляем..." : "Оставить комментарий"}
                </button>
              </form>

              {discussionError ? <p className="app-feedback app-feedback-error">{discussionError}</p> : null}

              {discussion.length ? (
                <CommunityCommentTree
                  comments={discussion}
                  onReply={onReply}
                  replyDrafts={replyDrafts}
                  setReplyDrafts={setReplyDrafts}
                  submitLabel={discussionPending ? "..." : "Ответить"}
                  pending={discussionPending}
                  isAdmin={isAdmin}
                  onHide={onHideComment}
                  onRemove={onRemoveComment}
                />
              ) : (
                <p className="empty-copy">Обсуждение пока пустое. Откройте его первым комментарием.</p>
              )}
            </div>
          </section>

          <aside className="challenge-modal-side">
            <div className="challenge-modal-section">
              <p className="app-kicker">Участие</p>
              <div className="challenge-energy-panel">
                <div className="challenge-energy-head">
                  <strong>Ритм челленджа</strong>
                  <span>{progressPercent}%</span>
                </div>
                <div className="challenge-energy-track">
                  <div className="challenge-energy-fill" style={{ width: `${progressPercent}%` }} />
                </div>
                <p>
                  {isParticipant
                    ? userGoalCompleted
                      ? "Вы закрыли личную цель челленджа. Можете остаться в обсуждении или выйти, когда будет удобно."
                      : "Вы уже внутри челленджа. Держите темп и добирайте прогресс до финиша."
                    : "Подключитесь к челленджу и начните собирать прогресс вместе с остальными участниками."}
                </p>
              </div>
              <button
                type="button"
                className="app-primary-button app-primary-button-wide"
                onClick={() => {
                  if (canLeave && onLeave) onLeave();
                  else onJoin();
                }}
                disabled={canLeave ? (leavePending ?? false) : joinPending}
              >
                {isParticipant
                  ? (leavePending ? "Выходим..." : (onLeave ? "Выйти из челленджа" : "Вы уже участвуете"))
                  : (joinPending ? "Подключаем..." : "Присоединиться")}
              </button>
              {isParticipant
                ? (leaveError ? <p className="app-feedback app-feedback-error">{leaveError}</p> : null)
                : (joinError ? <p className="app-feedback app-feedback-error">{joinError}</p> : null)}

              {onDelete ? (
                <div className="admin-inline-panel">
                  <button type="button" className="app-secondary-button app-primary-button-wide" onClick={onDelete} disabled={deletePending}>
                    {deletePending ? "Удаляем..." : "Удалить челлендж"}
                  </button>
                  {deleteError ? <p className="app-feedback app-feedback-error">{deleteError}</p> : null}
                </div>
              ) : null}

              {isAdmin ? (
                <div className="admin-inline-panel">
                  {onHideChallenge ? <button type="button" className="app-secondary-button app-primary-button-wide" onClick={onHideChallenge}>Скрыть челлендж</button> : null}
                  {onRemoveChallenge ? <button type="button" className="app-secondary-button app-primary-button-wide" onClick={onRemoveChallenge}>Удалить из витрины</button> : null}
                </div>
              ) : null}
            </div>

            <div className="challenge-modal-section">
              <p className="app-kicker">Участники</p>
              <div className="participant-cloud">
                {challenge.participants.map((participant) => (
                  <div key={participant.userId} className="participant-row participant-row-rich">
                    <div>
                      <strong><Link to={`/users/${participant.userId}`}>@{participant.nickname}</Link></strong>
                      <p>{participant.email}</p>
                    </div>
                    <span className="soft-chip challenge-modal-chip">{formatParticipantRole(participant.participantRole)}</span>
                  </div>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
