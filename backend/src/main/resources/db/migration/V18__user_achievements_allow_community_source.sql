-- Разрешаем источник COMMUNITY для наград из постов/комментариев/реакций
ALTER TABLE user_achievements DROP CONSTRAINT IF EXISTS user_achievements_source_check;

ALTER TABLE user_achievements
    ADD CONSTRAINT user_achievements_source_check
        CHECK (source IN ('HABIT', 'CHALLENGE', 'ADMIN', 'COMMUNITY'));
