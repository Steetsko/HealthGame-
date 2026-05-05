import { useMemo, useState, type Dispatch, type SetStateAction } from "react";
import { Link } from "react-router-dom";
import type { CommunityComment } from "../lib/types";

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("ru-RU", { day: "2-digit", month: "long" });
}

export function CommunityCommentTree({
  comments,
  onReply,
  replyDrafts,
  setReplyDrafts,
  submitLabel,
  pending,
  isAdmin = false,
  onHide,
  onRemove,
  readOnly = false,
  maxVisibleItems,
  showExpandButton = false
}: {
  comments: CommunityComment[];
  onReply: (payload: { text: string; parentCommentId?: number | null }) => void;
  replyDrafts: Record<number, string>;
  setReplyDrafts: Dispatch<SetStateAction<Record<number, string>>>;
  submitLabel: string;
  pending: boolean;
  isAdmin?: boolean;
  onHide?: (commentId: number) => void;
  onRemove?: (commentId: number) => void;
  readOnly?: boolean;
  maxVisibleItems?: number;
  showExpandButton?: boolean;
}) {
  const [revealedHiddenComments, setRevealedHiddenComments] = useState<Record<number, boolean>>({});
  const [expandedComments, setExpandedComments] = useState(false);

  const visibleComments = useMemo(() => {
    if (!maxVisibleItems || expandedComments) {
      return comments;
    }
    return comments.slice(0, maxVisibleItems);
  }, [comments, expandedComments, maxVisibleItems]);

  return (
    <div className="comment-thread">
      {visibleComments.map((comment) => {
        const isHidden = comment.moderationStatus === "HIDDEN";
        const isRevealed = Boolean(revealedHiddenComments[comment.id]);

        return (
          <div key={comment.id} className={`comment-item ${isHidden ? "comment-item-hidden" : ""}`}>
            <div className="comment-topline">
              <div>
                <strong><Link to={`/users/${comment.authorId}`}>{comment.authorName}</Link></strong>
                <span className="comment-meta">
                  <Link to={`/users/${comment.authorId}`}>@{comment.authorNickname}</Link> • {formatDate(comment.createdAt)}
                </span>
              </div>
              <div className="inline-actions">
                {isHidden ? <span className="soft-chip">Скрыто модерацией</span> : null}
                {isAdmin ? (
                  <>
                    {onHide ? <button type="button" className="app-secondary-button" onClick={() => onHide(comment.id)}>Скрыть</button> : null}
                    {onRemove ? <button type="button" className="app-secondary-button" onClick={() => onRemove(comment.id)}>Удалить</button> : null}
                  </>
                ) : null}
              </div>
            </div>

            {isHidden ? (
              <div className="moderation-banner">
                <strong>Контент скрыт модерацией</strong>
                <p>{comment.moderationNote || "Комментарий временно скрыт из-за спорного или нежелательного содержания."}</p>
                <button
                  type="button"
                  className="app-secondary-button moderation-toggle-button"
                  onClick={() =>
                    setRevealedHiddenComments((current) => ({
                      ...current,
                      [comment.id]: !current[comment.id]
                    }))
                  }
                >
                  {isRevealed ? "Снова скрыть содержимое" : "Показать содержимое"}
                </button>
              </div>
            ) : null}

            <div className={`moderated-copy-shell ${isHidden ? "moderated-copy-shell-hidden" : ""}`}>
              <p className={isHidden && !isRevealed ? "moderated-copy" : undefined}>{comment.text}</p>
              {isHidden && !isRevealed ? <div className="moderated-copy-overlay">Содержимое скрыто до вашего подтверждения</div> : null}
            </div>

            {!readOnly ? (
              <div className="comment-compose-inline">
                <input
                  value={replyDrafts[comment.id] ?? ""}
                  onChange={(event) => setReplyDrafts((current) => ({ ...current, [comment.id]: event.target.value }))}
                  placeholder="Написать ответ на комментарий"
                />
                <button
                  type="button"
                  className="app-secondary-button"
                  onClick={() => {
                    const text = (replyDrafts[comment.id] ?? "").trim();
                    if (!text) return;
                    onReply({ text, parentCommentId: comment.id });
                    setReplyDrafts((current) => ({ ...current, [comment.id]: "" }));
                  }}
                  disabled={pending}
                >
                  {submitLabel}
                </button>
              </div>
            ) : null}

            {comment.replies.length ? (
              <div className="comment-replies">
                <CommunityCommentTree
                  comments={comment.replies}
                  onReply={onReply}
                  replyDrafts={replyDrafts}
                  setReplyDrafts={setReplyDrafts}
                  submitLabel={submitLabel}
                  pending={pending}
                  isAdmin={isAdmin}
                  onHide={onHide}
                  onRemove={onRemove}
                  readOnly={readOnly}
                />
              </div>
            ) : null}
          </div>
        );
      })}

      {showExpandButton && maxVisibleItems && comments.length > maxVisibleItems ? (
        <button type="button" className="app-secondary-button comments-expand-button" onClick={() => setExpandedComments((current) => !current)}>
          {expandedComments ? "Свернуть комментарии" : `Смотреть больше комментариев (${comments.length - maxVisibleItems})`}
        </button>
      ) : null}
    </div>
  );
}
