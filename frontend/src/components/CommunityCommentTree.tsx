import { type Dispatch, type SetStateAction } from "react";
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
  pending
}: {
  comments: CommunityComment[];
  onReply: (payload: { text: string; parentCommentId?: number | null }) => void;
  replyDrafts: Record<number, string>;
  setReplyDrafts: Dispatch<SetStateAction<Record<number, string>>>;
  submitLabel: string;
  pending: boolean;
}) {
  return (
    <div className="comment-thread">
      {comments.map((comment) => (
        <div key={comment.id} className="comment-item">
          <strong>{comment.authorName}</strong>
          <span className="comment-meta">
            @{comment.authorNickname} • {formatDate(comment.createdAt)}
          </span>
          <p>{comment.text}</p>
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
          {comment.replies.length ? (
            <div className="comment-replies">
              <CommunityCommentTree
                comments={comment.replies}
                onReply={onReply}
                replyDrafts={replyDrafts}
                setReplyDrafts={setReplyDrafts}
                submitLabel={submitLabel}
                pending={pending}
              />
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}
