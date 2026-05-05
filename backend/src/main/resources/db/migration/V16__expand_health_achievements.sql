INSERT INTO achievements (code, name, description, icon, rarity, is_active)
VALUES
    ('HABIT_ROOKIE', 'Ритм новичка', 'Получено за 3 выполненные привычки.', 'medal', 'common', TRUE),
    ('STEADY_RHYTHM', 'Стабильный ритм', 'Получено за 10 выполненных привычек.', 'calendar', 'rare', TRUE),
    ('CHALLENGE_TRAVELER', 'Исследователь челленджей', 'Получено за участие в 3 челленджах.', 'compass', 'rare', TRUE),
    ('CHALLENGE_VETERAN', 'Ветеран челленджей', 'Получено за участие в 10 челленджах.', 'crown', 'epic', TRUE),
    ('FIRST_POST', 'Голос сообщества', 'Получено за публикацию первого поста.', 'pen', 'common', TRUE),
    ('FIRST_REACTION', 'Первая реакция', 'Получено за первую реакцию на пост.', 'bolt', 'common', TRUE)
ON CONFLICT (code) DO NOTHING;
