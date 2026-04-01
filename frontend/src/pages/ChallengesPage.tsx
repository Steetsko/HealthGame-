import { FormEvent, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { commentOnChallengeDiscussion, deleteChallenge, getChallenge, getChallengeDiscussion, getMyChallenges, getPublicChallenges, leaveChallenge } from "../lib/api";
import { getApiErrorMessage } from "../lib/errors";
import { ChallengeModal } from "../components/ChallengeModal";

export function ChallengesPage() {
  const qc = useQueryClient();
  const [selectedChallengeId, setSelectedChallengeId] = useState<number | null>(null);
  const [challengeComment, setChallengeComment] = useState("");
  const [challengeReplyDrafts, setChallengeReplyDrafts] = useState<Record<number, string>>({});

  const myChallengesQuery = useQuery({
    queryKey: ["my-challenges", "expanded"],
    queryFn: getMyChallenges
  });

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

  const leaveChallengeMutation = useMutation({
    mutationFn: leaveChallenge,
    onSuccess: async () => {
      setSelectedChallengeId(null);
      await Promise.all([qc.invalidateQueries({ queryKey: ["my-challenges"] }), qc.invalidateQueries({ queryKey: ["my-challenges", "expanded"] })]);
    }
  });

  const deleteChallengeMutation = useMutation({
    mutationFn: deleteChallenge,
    onSuccess: async () => {
      setSelectedChallengeId(null);
      await Promise.all([qc.invalidateQueries({ queryKey: ["my-challenges"] }), qc.invalidateQueries({ queryKey: ["my-challenges", "expanded"] })]);
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

  function submitChallengeComment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedChallengeId || !challengeComment.trim()) return;
    commentOnChallengeMutation.mutate({ challengeId: selectedChallengeId, payload: { text: challengeComment.trim() } });
  }

  return (
    <section className="product-page home-stage">
      <article className="home-hero-card home-hero-card-simple">
        <div className="home-hero-copy">
          <p className="app-kicker">Челленджи</p>
          <h1>Активные маршруты, командный ритм и единые цели.</h1>
          <p>
            Здесь собраны ваши челленджи и открытая витрина публичных маршрутов. Можно присоединяться, обсуждать правила,
            следить за участниками и держать темп через общую цель.
          </p>
        </div>
        <div className="home-hero-grid">
          <div className="home-stat-card"><span>Мои челленджи</span><strong>{myChallengesQuery.data?.content.length ?? 0}</strong></div>
          <div className="home-stat-card"><span>Публичные</span><strong>{publicChallengesQuery.data?.content.length ?? 0}</strong></div>
          <div className="home-stat-card home-stat-card-wide"><span>Что внутри</span><strong>Обсуждение, участники, цель и понятная точка входа в каждый челлендж.</strong></div>
        </div>
      </article>

      <article className="app-card home-section-card">
        <div className="card-head card-head-spread">
          <div>
            <p className="app-kicker">Мои челленджи</p>
            <h2>Личные и командные маршруты, в которых вы уже участвуете</h2>
          </div>
          <Link to="/home" className="app-secondary-button">Вернуться к обзору</Link>
        </div>

        <div className="challenge-gallery-grid">
          {(myChallengesQuery.data?.content ?? []).filter((c) => c.status === "ACTIVE").map((challenge) => (
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
                <span className="soft-chip">{challenge.status}</span>
              </div>
              <p>{challenge.description}</p>
              <span className="challenge-list-meta">Участников: {challenge.participantCount ?? 0} • Цель: {challenge.goalValue}</span>
              {challenge.coverImageUrl ? <img src={challenge.coverImageUrl} alt={challenge.name} className="challenge-card-image" /> : null}
              <div className="challenge-gallery-cta">Открыть детали</div>
            </button>
          ))}
        </div>
      </article>

      <article className="app-card home-section-card">
        <div className="card-head card-head-spread">
          <div>
            <p className="app-kicker">Публичные челленджи</p>
            <h2>Маршруты, доступные для подключения прямо сейчас</h2>
          </div>
        </div>

        <div className="challenge-gallery-grid">
          {(publicChallengesQuery.data?.content ?? []).filter((c) => c.status === "ACTIVE").map((challenge) => (
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
                <span className="soft-chip">{challenge.status}</span>
              </div>
              <p>{challenge.description}</p>
              <span className="challenge-list-meta">Участников: {challenge.participantCount ?? 0} • Цель: {challenge.goalValue}</span>
              {challenge.coverImageUrl ? <img src={challenge.coverImageUrl} alt={challenge.name} className="challenge-card-image" /> : null}
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
        discussionError={commentOnChallengeMutation.isError ? getApiErrorMessage(commentOnChallengeMutation.error, "Не удалось добавить комментарий в обсуждение челленджа.") : null}
        discussionPending={commentOnChallengeMutation.isPending}
        joinPending={false}
        joinError={null}
        leavePending={leaveChallengeMutation.isPending}
        leaveError={leaveChallengeMutation.isError ? getApiErrorMessage(leaveChallengeMutation.error, "Не удалось выйти из челленджа.") : null}
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
        onJoin={() => {}}
        onLeave={() => challengeDetailsQuery.data && leaveChallengeMutation.mutate(challengeDetailsQuery.data.id)}
        onSubmitDiscussion={submitChallengeComment}
        onReply={(payload) => selectedChallengeId && commentOnChallengeMutation.mutate({ challengeId: selectedChallengeId, payload })}
      />
    </section>
  );
}
