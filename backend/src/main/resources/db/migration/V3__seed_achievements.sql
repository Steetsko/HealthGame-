INSERT INTO achievements (code, name, description, icon, rarity, is_active)
VALUES
  ('FIRST_CHECKIN', 'First Step', 'Awarded for the first completed habit check-in', 'sparkles', 'common', TRUE),
  ('CHALLENGE_JOINER', 'Team Player', 'Awarded for joining the first challenge', 'users', 'rare', TRUE)
ON CONFLICT (code) DO NOTHING;

INSERT INTO achievement_rules (achievement_id, event_type, threshold, parameter, is_enabled)
SELECT a.id, 'HABIT_CHECKIN', 1, NULL, TRUE
FROM achievements a
WHERE a.code = 'FIRST_CHECKIN'
  AND NOT EXISTS (
    SELECT 1 FROM achievement_rules r
    WHERE r.achievement_id = a.id AND r.event_type = 'HABIT_CHECKIN' AND r.threshold = 1
  );

INSERT INTO achievement_rules (achievement_id, event_type, threshold, parameter, is_enabled)
SELECT a.id, 'CHALLENGE_JOIN', 1, NULL, TRUE
FROM achievements a
WHERE a.code = 'CHALLENGE_JOINER'
  AND NOT EXISTS (
    SELECT 1 FROM achievement_rules r
    WHERE r.achievement_id = a.id AND r.event_type = 'CHALLENGE_JOIN' AND r.threshold = 1
  );