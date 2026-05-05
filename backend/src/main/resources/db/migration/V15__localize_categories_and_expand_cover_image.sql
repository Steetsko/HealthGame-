ALTER TABLE challenges
    ALTER COLUMN cover_image_url TYPE TEXT;

UPDATE habit_categories
SET name = CASE
    WHEN LOWER(name) = 'hydration' THEN 'Гидрация'
    WHEN LOWER(name) = 'activity' THEN 'Активность'
    WHEN LOWER(name) = 'sleep' THEN 'Сон'
    WHEN LOWER(name) = 'nutrition' THEN 'Питание'
    WHEN LOWER(name) = 'mindfulness' THEN 'Осознанность'
    ELSE name
END,
description = CASE
    WHEN LOWER(name) = 'hydration' THEN 'Вода, чай и полезный питьевой ритм'
    WHEN LOWER(name) = 'activity' THEN 'Шаги, тренировки и движение каждый день'
    WHEN LOWER(name) = 'sleep' THEN 'Сон, вечерний ритуал и восстановление'
    WHEN LOWER(name) = 'nutrition' THEN 'Питание, полезные перекусы и режим'
    WHEN LOWER(name) = 'mindfulness' THEN 'Медитация, дыхание и спокойный фокус'
    ELSE description
END;

INSERT INTO achievements (code, name, description, icon, rarity, is_active)
VALUES ('CHALLENGE_CREATOR', 'Создатель маршрута', 'Получено за создание первого челленджа.', 'target', 'rare', TRUE)
ON CONFLICT (code) DO NOTHING;
