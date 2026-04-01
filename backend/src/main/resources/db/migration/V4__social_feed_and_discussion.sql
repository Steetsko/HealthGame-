ALTER TABLE posts
  ADD COLUMN image_url VARCHAR(500),
  ADD COLUMN challenge_id BIGINT REFERENCES challenges(id) ON DELETE CASCADE;

ALTER TABLE comments
  ADD COLUMN challenge_id BIGINT REFERENCES challenges(id) ON DELETE CASCADE,
  ADD COLUMN parent_comment_id BIGINT REFERENCES comments(id) ON DELETE CASCADE;

ALTER TABLE comments
  ALTER COLUMN post_id DROP NOT NULL;

ALTER TABLE comments
  ADD CONSTRAINT chk_comments_target
  CHECK (
    (post_id IS NOT NULL AND challenge_id IS NULL) OR
    (post_id IS NULL AND challenge_id IS NOT NULL)
  );

CREATE INDEX ix_posts_challenge_id ON posts(challenge_id);
CREATE INDEX ix_comments_challenge_id ON comments(challenge_id);
CREATE INDEX ix_comments_parent_comment_id ON comments(parent_comment_id);
