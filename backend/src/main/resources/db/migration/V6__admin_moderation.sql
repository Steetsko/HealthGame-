ALTER TABLE challenges
  ADD COLUMN moderation_status VARCHAR(16) NOT NULL DEFAULT 'VISIBLE' CHECK (moderation_status IN ('VISIBLE','HIDDEN','REMOVED')),
  ADD COLUMN moderated_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN moderated_at TIMESTAMPTZ,
  ADD COLUMN moderation_note VARCHAR(500);

ALTER TABLE posts
  ADD COLUMN moderation_status VARCHAR(16) NOT NULL DEFAULT 'VISIBLE' CHECK (moderation_status IN ('VISIBLE','HIDDEN','REMOVED')),
  ADD COLUMN moderated_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN moderated_at TIMESTAMPTZ,
  ADD COLUMN moderation_note VARCHAR(500);

ALTER TABLE comments
  ADD COLUMN moderation_status VARCHAR(16) NOT NULL DEFAULT 'VISIBLE' CHECK (moderation_status IN ('VISIBLE','HIDDEN','REMOVED')),
  ADD COLUMN moderated_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN moderated_at TIMESTAMPTZ,
  ADD COLUMN moderation_note VARCHAR(500);

CREATE INDEX ix_challenges_moderation_status ON challenges(moderation_status);
CREATE INDEX ix_posts_moderation_status ON posts(moderation_status);
CREATE INDEX ix_comments_moderation_status ON comments(moderation_status);

INSERT INTO user_roles (user_id, role_id)
SELECT 1, r.id
FROM roles r
WHERE r.code = 'ROLE_ADMIN'
  AND EXISTS (SELECT 1 FROM users u WHERE u.id = 1)
ON CONFLICT DO NOTHING;