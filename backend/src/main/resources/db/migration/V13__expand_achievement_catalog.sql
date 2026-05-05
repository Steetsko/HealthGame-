UPDATE achievements
SET
  name = CASE code
    WHEN 'FIRST_CHECKIN' THEN 'Первый шаг'
    WHEN 'CHALLENGE_JOINER' THEN 'Командный игрок'
    ELSE name
  END,
  description = CASE code
    WHEN 'FIRST_CHECKIN' THEN 'Получено за первую отмеченную привычку.'
    WHEN 'CHALLENGE_JOINER' THEN 'Получено за вступление в первый челлендж.'
    ELSE description
  END
WHERE code IN ('FIRST_CHECKIN', 'CHALLENGE_JOINER');

INSERT INTO achievements (code, name, description, icon, rarity, is_active)
VALUES
  ('FIRST_COMMENT', 'Первый комментарий', 'Получено за первый комментарий в блоге или обсуждении челленджа.', 'sparkles', 'common', TRUE),
  ('CHALLENGE_CREATOR', 'Создатель маршрута', 'Получено за создание первого челленджа.', 'target', 'rare', TRUE),
  ('CHALLENGE_FINISHER', 'Финишер', 'Получено за завершение первого челленджа.', 'trophy', 'rare', TRUE),
  ('STEADY_RHYTHM', 'Стабильный ритм', 'Получено за выполнение 10 привычек.', 'calendar', 'common', TRUE),
  ('TEAM_PACE', 'Командный темп', 'Получено за прохождение 3 челленджей.', 'users', 'epic', TRUE),
  ('WATER_START', 'Водный старт', 'Получено за выполнение 3 привычек из категории Вода.', 'heart', 'common', TRUE),
  ('HABIT_STRENGTH', 'Сила привычки', 'Получено за серию из 7 дней.', 'flame', 'epic', TRUE)
ON CONFLICT (code) DO NOTHING;
