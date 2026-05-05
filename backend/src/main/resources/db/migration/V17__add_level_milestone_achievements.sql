INSERT INTO achievements (code, name, description, icon, rarity, is_active)
VALUES
    ('LEVEL_GREEN', 'Зелёный ранг', 'Получено за достижение 10 уровня.', 'leaf', 'common', TRUE),
    ('LEVEL_YELLOW', 'Жёлтый ранг', 'Получено за достижение 11 уровня.', 'sun', 'rare', TRUE),
    ('LEVEL_ORANGE', 'Оранжевый ранг', 'Получено за достижение 31 уровня.', 'flame', 'epic', TRUE),
    ('LEVEL_RED', 'Красный ранг', 'Получено за достижение 51 уровня.', 'shield', 'epic', TRUE)
ON CONFLICT (code) DO NOTHING;
