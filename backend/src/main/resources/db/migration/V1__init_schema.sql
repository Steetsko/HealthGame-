-- =========================
-- 1) users
-- =========================
CREATE TABLE users (
  id                 BIGSERIAL PRIMARY KEY,
  email              VARCHAR(320) NOT NULL UNIQUE,
  phone              VARCHAR(32) UNIQUE,
  password_hash      VARCHAR(255) NOT NULL,
  nickname           VARCHAR(64)  NOT NULL UNIQUE,
  first_name         VARCHAR(100),
  timezone           VARCHAR(64)  NOT NULL DEFAULT 'Europe/Paris',
  status             VARCHAR(16)  NOT NULL CHECK (status IN ('active','blocked','deleted')),
  registered_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  last_login_at      TIMESTAMPTZ
);

-- =========================
-- 2) roles
-- =========================
CREATE TABLE roles (
  id          SMALLSERIAL PRIMARY KEY,
  code        VARCHAR(32) NOT NULL UNIQUE,
  description VARCHAR(255)
);

-- =========================
-- join table (m:n) user_roles (does NOT count as "main")
-- =========================
CREATE TABLE user_roles (
  user_id BIGINT   NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_id SMALLINT NOT NULL REFERENCES roles(id) ON DELETE RESTRICT,
  PRIMARY KEY (user_id, role_id)
);

-- =========================
-- 3) habit_categories
-- =========================
CREATE TABLE habit_categories (
  id          SERIAL PRIMARY KEY,
  name        VARCHAR(80) NOT NULL UNIQUE,
  description VARCHAR(500),
  icon        VARCHAR(128)
);

-- =========================
-- 4) habits
-- =========================
CREATE TABLE habits (
  id              BIGSERIAL PRIMARY KEY,
  user_id         BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category_id     INT    NOT NULL REFERENCES habit_categories(id) ON DELETE RESTRICT,
  name            VARCHAR(120) NOT NULL,
  description     VARCHAR(1000),
  start_date      DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date        DATE,
  target_value    INT  NOT NULL CHECK (target_value > 0),
  unit            VARCHAR(20) NOT NULL, -- "ml", "min", "times", etc.
  frequency       VARCHAR(16) NOT NULL CHECK (frequency IN ('DAILY','WEEKLY','CUSTOM')),
  is_active       BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE INDEX ix_habits_user_id     ON habits(user_id);
CREATE INDEX ix_habits_category_id ON habits(category_id);

-- =========================
-- 5) habit_schedules
-- =========================
CREATE TABLE habit_schedules (
  id                BIGSERIAL PRIMARY KEY,
  habit_id           BIGINT NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
  day_of_week        SMALLINT CHECK (day_of_week BETWEEN 1 AND 7), -- 1=Mon ... 7=Sun
  time_of_day        TIME,
  min_times_per_day  SMALLINT CHECK (min_times_per_day > 0),
  is_enabled         BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE INDEX ix_habit_schedules_habit_id ON habit_schedules(habit_id);

-- =========================
-- 6) habit_checkins
-- =========================
CREATE TABLE habit_checkins (
  id          BIGSERIAL PRIMARY KEY,
  habit_id     BIGINT NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
  checkin_date DATE NOT NULL,
  value        INT  NOT NULL CHECK (value >= 0),
  comment      VARCHAR(500),
  source       VARCHAR(16) NOT NULL CHECK (source IN ('manual','integration')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (habit_id, checkin_date)
);

CREATE INDEX ix_habit_checkins_habit_id ON habit_checkins(habit_id);
CREATE INDEX ix_habit_checkins_date     ON habit_checkins(checkin_date);

-- =========================
-- 7) challenges
-- =========================
CREATE TABLE challenges (
  id              BIGSERIAL PRIMARY KEY,
  creator_id      BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  name            VARCHAR(140) NOT NULL,
  description     VARCHAR(2000),
  start_date      DATE NOT NULL,
  end_date        DATE NOT NULL,
  goal_type       VARCHAR(24) NOT NULL CHECK (goal_type IN ('SUM_VALUE','DAYS_COUNT','STREAK')),
  goal_value      INT NOT NULL CHECK (goal_value > 0),
  status          VARCHAR(16) NOT NULL CHECK (status IN ('DRAFT','ACTIVE','FINISHED','CANCELLED')),
  is_public       BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX ix_challenges_creator_id ON challenges(creator_id);
CREATE INDEX ix_challenges_status     ON challenges(status);

-- =========================
-- join table (m:n) challenge_participants (does NOT count as "main")
-- =========================
CREATE TABLE challenge_participants (
  challenge_id   BIGINT NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
  user_id        BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  participant_role VARCHAR(16) NOT NULL CHECK (participant_role IN ('PARTICIPANT','ORGANIZER')),
  participant_status VARCHAR(16) NOT NULL CHECK (participant_status IN ('INVITED','ACCEPTED','DECLINED','LEFT')),
  joined_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (challenge_id, user_id)
);

CREATE INDEX ix_challenge_participants_user_id ON challenge_participants(user_id);

-- =========================
-- 8) achievements
-- =========================
CREATE TABLE achievements (
  id          SERIAL PRIMARY KEY,
  code        VARCHAR(64) NOT NULL UNIQUE,
  name        VARCHAR(140) NOT NULL,
  description VARCHAR(1000) NOT NULL,
  icon        VARCHAR(128),
  rarity      VARCHAR(16) NOT NULL CHECK (rarity IN ('common','rare','epic')),
  is_active   BOOLEAN NOT NULL DEFAULT TRUE
);

-- =========================
-- 9) achievement_rules
-- =========================
CREATE TABLE achievement_rules (
  id              BIGSERIAL PRIMARY KEY,
  achievement_id  INT NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,
  event_type      VARCHAR(32) NOT NULL, -- e.g. 'HABIT_STREAK', 'CHALLENGE_FINISHED'
  threshold       INT NOT NULL CHECK (threshold > 0),
  parameter       VARCHAR(64),
  is_enabled      BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE INDEX ix_achievement_rules_achievement_id ON achievement_rules(achievement_id);

-- =========================
-- 10) user_achievements (fact of being awarded)
-- =========================
CREATE TABLE user_achievements (
  id              BIGSERIAL PRIMARY KEY,
  user_id         BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  achievement_id  INT NOT NULL REFERENCES achievements(id) ON DELETE RESTRICT,
  awarded_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  source          VARCHAR(24) NOT NULL CHECK (source IN ('HABIT','CHALLENGE','ADMIN')),
  context_json    JSONB,
  UNIQUE (user_id, achievement_id)
);

CREATE INDEX ix_user_achievements_user_id ON user_achievements(user_id);

-- =========================
-- 11) posts (social feed)
-- =========================
CREATE TABLE posts (
  id          BIGSERIAL PRIMARY KEY,
  author_id   BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type        VARCHAR(24) NOT NULL CHECK (type IN ('TEXT','ACHIEVEMENT','CHALLENGE','HABIT')),
  text        VARCHAR(2000),
  visibility  VARCHAR(16) NOT NULL CHECK (visibility IN ('PUBLIC','FRIENDS','PRIVATE')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX ix_posts_author_id  ON posts(author_id);
CREATE INDEX ix_posts_created_at ON posts(created_at);

-- =========================
-- 12) comments
-- =========================
CREATE TABLE comments (
  id          BIGSERIAL PRIMARY KEY,
  post_id     BIGINT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  author_id   BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  text        VARCHAR(1000) NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX ix_comments_post_id ON comments(post_id);

-- =========================
-- 13) notifications
-- =========================
CREATE TABLE notifications (
  id            BIGSERIAL PRIMARY KEY,
  recipient_id  BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type          VARCHAR(32) NOT NULL,
  title         VARCHAR(200) NOT NULL,
  message       VARCHAR(1000) NOT NULL,
  is_read       BOOLEAN NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  link_json     JSONB
);

CREATE INDEX ix_notifications_recipient_id ON notifications(recipient_id);
CREATE INDEX ix_notifications_is_read      ON notifications(is_read);

-- =========================
-- 14) external_integrations
-- =========================
CREATE TABLE external_integrations (
  id              BIGSERIAL PRIMARY KEY,
  user_id          BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider        VARCHAR(32) NOT NULL, -- 'google_fit', 'strava', 'weather', 'maps'
  external_user   VARCHAR(128),
  status          VARCHAR(16) NOT NULL CHECK (status IN ('CONNECTED','ERROR','DISCONNECTED')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, provider)
);

CREATE INDEX ix_external_integrations_user_id ON external_integrations(user_id);

-- =========================
-- 15) integration_tokens
-- =========================
CREATE TABLE integration_tokens (
  id              BIGSERIAL PRIMARY KEY,
  integration_id  BIGINT NOT NULL REFERENCES external_integrations(id) ON DELETE CASCADE,
  access_token    TEXT NOT NULL,
  refresh_token   TEXT,
  expires_at      TIMESTAMPTZ,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX ix_integration_tokens_integration_id ON integration_tokens(integration_id);

-- =========================
-- Optional join table (m:n) post_reactions (does NOT count as "main")
-- =========================
CREATE TABLE post_reactions (
  post_id     BIGINT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id     BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reaction    VARCHAR(16) NOT NULL CHECK (reaction IN ('like','fire','clap')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (post_id, user_id)
);
-- =========================
-- 16) refresh_tokens
-- =========================
CREATE TABLE refresh_tokens (
  id          BIGSERIAL PRIMARY KEY,
  user_id     BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash  VARCHAR(255) NOT NULL UNIQUE,
  device_info VARCHAR(255),
  ip_address  VARCHAR(64),
  user_agent  VARCHAR(512),
  expires_at  TIMESTAMPTZ NOT NULL,
  revoked_at  TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX ix_refresh_tokens_user_id ON refresh_tokens(user_id);

-- =========================
-- 17) friendships
-- =========================
CREATE TABLE friendships (
  requester_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  addressee_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status       VARCHAR(16) NOT NULL CHECK (status IN ('PENDING','ACCEPTED','DECLINED','BLOCKED')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  responded_at TIMESTAMPTZ,
  PRIMARY KEY (requester_id, addressee_id),
  CHECK (requester_id <> addressee_id)
);

CREATE INDEX ix_friendships_addressee_id ON friendships(addressee_id);

-- =========================
-- 18) challenge_targets
-- =========================
CREATE TABLE challenge_targets (
  id           BIGSERIAL PRIMARY KEY,
  challenge_id BIGINT NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
  target_kind  VARCHAR(16) NOT NULL CHECK (target_kind IN ('HABIT','CATEGORY','UNIT')),
  habit_id     BIGINT REFERENCES habits(id) ON DELETE CASCADE,
  category_id  INT REFERENCES habit_categories(id) ON DELETE CASCADE,
  unit         VARCHAR(20),
  CHECK (
    (target_kind = 'HABIT' AND habit_id IS NOT NULL AND category_id IS NULL AND unit IS NULL) OR
    (target_kind = 'CATEGORY' AND habit_id IS NULL AND category_id IS NOT NULL AND unit IS NULL) OR
    (target_kind = 'UNIT' AND habit_id IS NULL AND category_id IS NULL AND unit IS NOT NULL)
  )
);

CREATE INDEX ix_challenge_targets_challenge_id ON challenge_targets(challenge_id);

-- =========================
-- 19) challenge_progress
-- =========================
CREATE TABLE challenge_progress (
  challenge_id        BIGINT NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
  user_id             BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  current_value       INT NOT NULL DEFAULT 0,
  completion_percent  NUMERIC(5,2) NOT NULL DEFAULT 0,
  last_checkin_date   DATE,
  completed_at        TIMESTAMPTZ,
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (challenge_id, user_id)
);

CREATE INDEX ix_challenge_progress_user_id ON challenge_progress(user_id);

-- =========================
-- Extend challenge_participants for invite flow
-- =========================
ALTER TABLE challenge_participants
  ADD COLUMN invited_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN invited_at TIMESTAMPTZ,
  ADD COLUMN responded_at TIMESTAMPTZ;

-- =========================
-- Seed roles
-- =========================
INSERT INTO roles (code, description)
VALUES
  ('ROLE_USER', 'Default user role'),
  ('ROLE_ADMIN', 'Administrative role')
ON CONFLICT (code) DO NOTHING;
