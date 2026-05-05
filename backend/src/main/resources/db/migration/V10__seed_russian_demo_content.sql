UPDATE habit_categories
SET description = CASE name
    WHEN 'Hydration' THEN 'Вода, чай и полезный питьевой ритм'
    WHEN 'Activity' THEN 'Шаги, тренировки и движение каждый день'
    WHEN 'Sleep' THEN 'Сон, вечерний ритуал и восстановление'
    WHEN 'Nutrition' THEN 'Питание, полезные перекусы и режим'
    WHEN 'Mindfulness' THEN 'Медитация, дыхание и спокойный фокус'
    ELSE description
END;

UPDATE achievements
SET name = CASE code
        WHEN 'FIRST_CHECKIN' THEN 'Первый шаг'
        WHEN 'CHALLENGE_JOINER' THEN 'Командный игрок'
        ELSE name
    END,
    description = CASE code
        WHEN 'FIRST_CHECKIN' THEN 'Получено за первое выполненное действие по привычке'
        WHEN 'CHALLENGE_JOINER' THEN 'Получено за вступление в первый челлендж'
        ELSE description
    END;

INSERT INTO achievements (code, name, description, icon, rarity, is_active)
VALUES
    ('STREAK_SPARK', 'Искра серии', 'Серия без пропусков держится уже неделю', 'flame', 'rare', TRUE),
    ('FOCUS_MASTER', 'Мастер фокуса', 'Пять дней подряд с высоким дневным рейтингом', 'target', 'epic', TRUE),
    ('SOCIAL_HEART', 'Сердце сообщества', 'Публикации пользователя собирают живую реакцию', 'heart', 'rare', TRUE)
ON CONFLICT (code) DO NOTHING;

INSERT INTO users (email, phone, password_hash, nickname, first_name, timezone, status, avatar_url, registered_at, last_login_at)
VALUES
    ('irina@healthgame.local', '+375291110011', '$2a$10$IDYz7FTzfKiftzPGItuMHuzOgaEhK28/IF8I1IVGPClhGp7z2MIK.', 'irina_run', 'Ирина', 'Europe/Minsk', 'active', 'https://randomuser.me/api/portraits/women/44.jpg', NOW() - INTERVAL '18 day', NOW() - INTERVAL '2 hour'),
    ('maksim@healthgame.local', '+375291110022', '$2a$10$IDYz7FTzfKiftzPGItuMHuzOgaEhK28/IF8I1IVGPClhGp7z2MIK.', 'maks_focus', 'Максим', 'Europe/Minsk', 'active', 'https://randomuser.me/api/portraits/men/32.jpg', NOW() - INTERVAL '14 day', NOW() - INTERVAL '5 hour'),
    ('alena@healthgame.local', '+375291110033', '$2a$10$IDYz7FTzfKiftzPGItuMHuzOgaEhK28/IF8I1IVGPClhGp7z2MIK.', 'alena_balance', 'Алёна', 'Europe/Minsk', 'active', 'https://randomuser.me/api/portraits/women/68.jpg', NOW() - INTERVAL '11 day', NOW() - INTERVAL '1 day')
ON CONFLICT (email) DO NOTHING;

UPDATE users
SET first_name = CASE email
        WHEN 'a74702784@gmail.com' THEN 'Анастасия'
        WHEN 'nastyasts@gmail.com' THEN 'Анастасия'
        ELSE first_name
    END,
    timezone = 'Europe/Minsk',
    status = 'active',
    avatar_url = CASE email
        WHEN 'a74702784@gmail.com' THEN 'https://randomuser.me/api/portraits/women/21.jpg'
        WHEN 'nastyasts@gmail.com' THEN 'https://randomuser.me/api/portraits/women/26.jpg'
        ELSE avatar_url
    END,
    last_login_at = COALESCE(last_login_at, NOW() - INTERVAL '6 hour')
WHERE email IN ('a74702784@gmail.com', 'nastyasts@gmail.com');

INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id
FROM users u
JOIN roles r ON r.code = 'ROLE_USER'
WHERE u.email IN (
    'a74702784@gmail.com',
    'nastyasts@gmail.com',
    'irina@healthgame.local',
    'maksim@healthgame.local',
    'alena@healthgame.local'
)
ON CONFLICT DO NOTHING;

INSERT INTO habits (user_id, category_id, name, description, start_date, end_date, target_value, unit, frequency, is_active)
SELECT u.id, c.id, seed.name, seed.description, CURRENT_DATE - 10, NULL, seed.target_value, seed.unit, seed.frequency, TRUE
FROM (
    VALUES
        ('a74702784@gmail.com', 'Hydration', 'Стакан воды после пробуждения', 'Мягкий старт дня: один стакан воды сразу после пробуждения.', 1, 'times', 'DAILY'),
        ('a74702784@gmail.com', 'Sleep', 'Ложиться до 22:30', 'Вечерний ритм без пролистывания ленты до ночи.', 1, 'times', 'DAILY'),
        ('a74702784@gmail.com', 'Activity', 'Прогулка 8 000 шагов', 'Ходьба в удобном темпе без пропусков.', 8000, 'steps', 'DAILY'),
        ('a74702784@gmail.com', 'Mindfulness', 'Пять минут тишины', 'Короткая утренняя пауза перед задачами.', 5, 'min', 'DAILY'),
        ('nastyasts@gmail.com', 'Nutrition', 'Полезный обед без сладкой газировки', 'Один спокойный прием пищи без лишнего сахара.', 1, 'times', 'DAILY'),
        ('nastyasts@gmail.com', 'Hydration', 'Две бутылки воды за день', 'Ровный питьевой план на учебу и работу.', 2, 'times', 'DAILY'),
        ('irina@healthgame.local', 'Activity', 'Кардио 20 минут', 'Легкий бег или домашняя тренировка.', 20, 'min', 'DAILY'),
        ('irina@healthgame.local', 'Sleep', 'Без телефона за час до сна', 'Вечер без яркого экрана и лишнего шума.', 1, 'times', 'DAILY'),
        ('maksim@healthgame.local', 'Mindfulness', 'Дыхательная практика', 'Два коротких цикла дыхания в середине дня.', 6, 'min', 'DAILY'),
        ('alena@healthgame.local', 'Nutrition', 'Овощи в каждом ужине', 'Минимум одна большая порция овощей вечером.', 1, 'times', 'DAILY')
) AS seed(email, category_name, name, description, target_value, unit, frequency)
JOIN users u ON u.email = seed.email
JOIN habit_categories c ON c.name = seed.category_name
WHERE NOT EXISTS (
    SELECT 1
    FROM habits h
    WHERE h.user_id = u.id
      AND h.name = seed.name
);

INSERT INTO habit_schedules (habit_id, day_of_week, time_of_day, min_times_per_day, is_enabled)
SELECT h.id,
       schedule.day_of_week,
       schedule.time_of_day,
       schedule.min_times_per_day,
       TRUE
FROM habits h
JOIN users u ON u.id = h.user_id
JOIN (
    VALUES
        ('Стакан воды после пробуждения', 1, '07:30'::time, 1),
        ('Стакан воды после пробуждения', 2, '07:30'::time, 1),
        ('Стакан воды после пробуждения', 3, '07:30'::time, 1),
        ('Стакан воды после пробуждения', 4, '07:30'::time, 1),
        ('Стакан воды после пробуждения', 5, '07:30'::time, 1),
        ('Стакан воды после пробуждения', 6, '08:30'::time, 1),
        ('Стакан воды после пробуждения', 7, '08:30'::time, 1),
        ('Ложиться до 22:30', 1, '22:30'::time, 1),
        ('Ложиться до 22:30', 2, '22:30'::time, 1),
        ('Ложиться до 22:30', 3, '22:30'::time, 1),
        ('Ложиться до 22:30', 4, '22:30'::time, 1),
        ('Ложиться до 22:30', 5, '22:30'::time, 1),
        ('Ложиться до 22:30', 6, '23:00'::time, 1),
        ('Ложиться до 22:30', 7, '23:00'::time, 1),
        ('Прогулка 8 000 шагов', 1, '18:30'::time, 1),
        ('Прогулка 8 000 шагов', 2, '18:30'::time, 1),
        ('Прогулка 8 000 шагов', 3, '18:30'::time, 1),
        ('Прогулка 8 000 шагов', 4, '18:30'::time, 1),
        ('Прогулка 8 000 шагов', 5, '18:30'::time, 1),
        ('Прогулка 8 000 шагов', 6, '11:00'::time, 1),
        ('Прогулка 8 000 шагов', 7, '11:00'::time, 1),
        ('Пять минут тишины', 1, '08:10'::time, 1),
        ('Пять минут тишины', 2, '08:10'::time, 1),
        ('Пять минут тишины', 3, '08:10'::time, 1),
        ('Пять минут тишины', 4, '08:10'::time, 1),
        ('Пять минут тишины', 5, '08:10'::time, 1),
        ('Две бутылки воды за день', 1, '10:00'::time, 2),
        ('Две бутылки воды за день', 2, '10:00'::time, 2),
        ('Две бутылки воды за день', 3, '10:00'::time, 2),
        ('Две бутылки воды за день', 4, '10:00'::time, 2),
        ('Две бутылки воды за день', 5, '10:00'::time, 2),
        ('Полезный обед без сладкой газировки', 1, '13:00'::time, 1),
        ('Полезный обед без сладкой газировки', 2, '13:00'::time, 1),
        ('Полезный обед без сладкой газировки', 3, '13:00'::time, 1),
        ('Полезный обед без сладкой газировки', 4, '13:00'::time, 1),
        ('Полезный обед без сладкой газировки', 5, '13:00'::time, 1)
    ) AS schedule(habit_name, day_of_week, time_of_day, min_times_per_day)
  ON schedule.habit_name = h.name
WHERE NOT EXISTS (
    SELECT 1
    FROM habit_schedules hs
    WHERE hs.habit_id = h.id
      AND hs.day_of_week = schedule.day_of_week
      AND hs.time_of_day = schedule.time_of_day
);

INSERT INTO habit_checkins (habit_id, checkin_date, value, comment, source)
SELECT h.id,
       gs::date,
       CASE
           WHEN h.unit = 'steps' THEN 8000
           WHEN h.unit = 'min' THEN h.target_value
           ELSE h.target_value
       END,
       CASE h.name
           WHEN 'Стакан воды после пробуждения' THEN 'День начался спокойно и без суеты.'
           WHEN 'Ложиться до 22:30' THEN 'Вечер закрыт вовремя, без лишнего экрана.'
           WHEN 'Прогулка 8 000 шагов' THEN 'Хорошая прогулка после дел.'
           WHEN 'Пять минут тишины' THEN 'Небольшая пауза вернула фокус.'
           WHEN 'Две бутылки воды за день' THEN 'Питьевой план закрыт до вечера.'
           WHEN 'Полезный обед без сладкой газировки' THEN 'Обед прошел без срыва.'
           WHEN 'Кардио 20 минут' THEN 'Нагрузка короткая, но бодрая.'
           WHEN 'Без телефона за час до сна' THEN 'Вечер вышел тихим и легким.'
           WHEN 'Дыхательная практика' THEN 'Голова стала заметно спокойнее.'
           WHEN 'Овощи в каждом ужине' THEN 'Ужин получился легким и собранным.'
           ELSE 'Привычка закрыта.'
       END,
       'manual'
FROM habits h
JOIN users u ON u.id = h.user_id
JOIN generate_series(CURRENT_DATE - INTERVAL '6 day', CURRENT_DATE, INTERVAL '1 day') gs ON TRUE
WHERE (
        (u.email = 'a74702784@gmail.com' AND h.name = 'Стакан воды после пробуждения' AND gs::date <> CURRENT_DATE - 1)
     OR (u.email = 'a74702784@gmail.com' AND h.name = 'Ложиться до 22:30' AND gs::date IN (CURRENT_DATE - 6, CURRENT_DATE - 5, CURRENT_DATE - 3, CURRENT_DATE - 2, CURRENT_DATE))
     OR (u.email = 'a74702784@gmail.com' AND h.name = 'Прогулка 8 000 шагов' AND gs::date IN (CURRENT_DATE - 6, CURRENT_DATE - 4, CURRENT_DATE - 3, CURRENT_DATE - 1))
     OR (u.email = 'a74702784@gmail.com' AND h.name = 'Пять минут тишины' AND gs::date <> CURRENT_DATE - 2)
     OR (u.email = 'nastyasts@gmail.com' AND h.name = 'Две бутылки воды за день' AND gs::date IN (CURRENT_DATE - 6, CURRENT_DATE - 5, CURRENT_DATE - 4, CURRENT_DATE - 2, CURRENT_DATE - 1, CURRENT_DATE))
     OR (u.email = 'nastyasts@gmail.com' AND h.name = 'Полезный обед без сладкой газировки' AND gs::date IN (CURRENT_DATE - 6, CURRENT_DATE - 3, CURRENT_DATE - 1, CURRENT_DATE))
     OR (u.email = 'irina@healthgame.local' AND h.name = 'Кардио 20 минут' AND gs::date IN (CURRENT_DATE - 5, CURRENT_DATE - 4, CURRENT_DATE - 2, CURRENT_DATE))
     OR (u.email = 'maksim@healthgame.local' AND h.name = 'Дыхательная практика' AND gs::date IN (CURRENT_DATE - 6, CURRENT_DATE - 5, CURRENT_DATE - 4, CURRENT_DATE - 3, CURRENT_DATE - 2))
     OR (u.email = 'alena@healthgame.local' AND h.name = 'Овощи в каждом ужине' AND gs::date IN (CURRENT_DATE - 6, CURRENT_DATE - 4, CURRENT_DATE - 3, CURRENT_DATE - 1, CURRENT_DATE))
    )
  AND NOT EXISTS (
      SELECT 1
      FROM habit_checkins hc
      WHERE hc.habit_id = h.id
        AND hc.checkin_date = gs::date
  );

INSERT INTO challenges (creator_id, name, description, start_date, end_date, goal_type, goal_value, status, is_public, moderation_status, cover_image_url)
SELECT u.id,
       seed.name,
       seed.description,
       seed.start_date,
       seed.end_date,
       seed.goal_type,
       seed.goal_value,
       'ACTIVE',
       TRUE,
       'VISIBLE',
       seed.cover_image_url
FROM (
    VALUES
        ('a74702784@gmail.com', '7 дней водного ритма', 'Спокойный челлендж на неделю: закрываем питьевой план каждый день и не проваливаемся по энергии.', CURRENT_DATE - 2, CURRENT_DATE + 8, 'DAYS_COUNT', 7, 'https://images.unsplash.com/photo-1548839140-29a749e1cf4d?auto=format&fit=crop&w=1200&q=80'),
        ('nastyasts@gmail.com', 'Шаги без пропусков', 'Собираем движение каждый день: цель — не сидеть весь день на месте и набрать хороший ритм.', CURRENT_DATE - 1, CURRENT_DATE + 12, 'SUM_VALUE', 40, 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&w=1200&q=80'),
        ('irina@healthgame.local', 'Тихое утро', 'Пять дней начинаем утро без шума: вода, дыхание и короткий фокус перед делами.', CURRENT_DATE, CURRENT_DATE + 10, 'STREAK', 5, 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&w=1200&q=80')
) AS seed(email, name, description, start_date, end_date, goal_type, goal_value, cover_image_url)
JOIN users u ON u.email = seed.email
WHERE NOT EXISTS (
    SELECT 1
    FROM challenges c
    WHERE c.creator_id = u.id
      AND c.name = seed.name
);

INSERT INTO challenge_targets (challenge_id, target_kind, category_id)
SELECT c.id, 'CATEGORY', hc.id
FROM challenges c
JOIN (
    VALUES
        ('7 дней водного ритма', 'Hydration'),
        ('Шаги без пропусков', 'Activity'),
        ('Тихое утро', 'Mindfulness')
    ) AS target(challenge_name, category_name)
  ON target.challenge_name = c.name
JOIN habit_categories hc ON hc.name = target.category_name
WHERE NOT EXISTS (
    SELECT 1
    FROM challenge_targets ct
    WHERE ct.challenge_id = c.id
);

INSERT INTO challenge_participants (challenge_id, user_id, participant_role, participant_status, joined_at, invited_by, invited_at, responded_at)
SELECT c.id,
       u.id,
       CASE WHEN c.creator_id = u.id THEN 'ORGANIZER' ELSE 'PARTICIPANT' END,
       'ACCEPTED',
       NOW() - INTERVAL '1 day',
       c.creator_id,
       NOW() - INTERVAL '2 day',
       NOW() - INTERVAL '1 day'
FROM challenges c
JOIN users u ON u.email IN (
    CASE c.name
        WHEN '7 дней водного ритма' THEN 'a74702784@gmail.com'
        WHEN 'Шаги без пропусков' THEN 'nastyasts@gmail.com'
        WHEN 'Тихое утро' THEN 'irina@healthgame.local'
    END,
    CASE c.name
        WHEN '7 дней водного ритма' THEN 'nastyasts@gmail.com'
        WHEN 'Шаги без пропусков' THEN 'a74702784@gmail.com'
        WHEN 'Тихое утро' THEN 'maksim@healthgame.local'
    END,
    CASE c.name
        WHEN '7 дней водного ритма' THEN 'alena@healthgame.local'
        WHEN 'Шаги без пропусков' THEN 'irina@healthgame.local'
        WHEN 'Тихое утро' THEN 'alena@healthgame.local'
    END
)
WHERE NOT EXISTS (
    SELECT 1
    FROM challenge_participants cp
    WHERE cp.challenge_id = c.id
      AND cp.user_id = u.id
);

INSERT INTO challenge_progress (challenge_id, user_id, current_value, completion_percent, last_checkin_date, completed_at, updated_at)
SELECT c.id,
       u.id,
       CASE
           WHEN c.name = '7 дней водного ритма' AND u.email = 'a74702784@gmail.com' THEN 5
           WHEN c.name = '7 дней водного ритма' AND u.email = 'nastyasts@gmail.com' THEN 4
           WHEN c.name = '7 дней водного ритма' AND u.email = 'alena@healthgame.local' THEN 3
           WHEN c.name = 'Шаги без пропусков' AND u.email = 'nastyasts@gmail.com' THEN 28
           WHEN c.name = 'Шаги без пропусков' AND u.email = 'a74702784@gmail.com' THEN 24
           WHEN c.name = 'Шаги без пропусков' AND u.email = 'irina@healthgame.local' THEN 19
           WHEN c.name = 'Тихое утро' AND u.email = 'irina@healthgame.local' THEN 3
           WHEN c.name = 'Тихое утро' AND u.email = 'maksim@healthgame.local' THEN 4
           WHEN c.name = 'Тихое утро' AND u.email = 'alena@healthgame.local' THEN 2
           ELSE 1
       END,
       CASE
           WHEN c.name = '7 дней водного ритма' AND u.email = 'a74702784@gmail.com' THEN 71.43
           WHEN c.name = '7 дней водного ритма' AND u.email = 'nastyasts@gmail.com' THEN 57.14
           WHEN c.name = '7 дней водного ритма' AND u.email = 'alena@healthgame.local' THEN 42.86
           WHEN c.name = 'Шаги без пропусков' AND u.email = 'nastyasts@gmail.com' THEN 70.00
           WHEN c.name = 'Шаги без пропусков' AND u.email = 'a74702784@gmail.com' THEN 60.00
           WHEN c.name = 'Шаги без пропусков' AND u.email = 'irina@healthgame.local' THEN 47.50
           WHEN c.name = 'Тихое утро' AND u.email = 'irina@healthgame.local' THEN 60.00
           WHEN c.name = 'Тихое утро' AND u.email = 'maksim@healthgame.local' THEN 80.00
           WHEN c.name = 'Тихое утро' AND u.email = 'alena@healthgame.local' THEN 40.00
           ELSE 10.00
       END,
       CURRENT_DATE,
       NULL,
       NOW()
FROM challenges c
JOIN users u ON EXISTS (
    SELECT 1
    FROM challenge_participants cp
    WHERE cp.challenge_id = c.id
      AND cp.user_id = u.id
)
WHERE NOT EXISTS (
    SELECT 1
    FROM challenge_progress cp
    WHERE cp.challenge_id = c.id
      AND cp.user_id = u.id
);

INSERT INTO posts (author_id, type, text, visibility, created_at, image_url, challenge_id, moderation_status)
SELECT u.id,
       'TEXT',
       seed.text,
       'PUBLIC',
       NOW() - seed.created_ago,
       seed.image_url,
       NULL,
       'VISIBLE'
FROM (
    VALUES
        ('a74702784@gmail.com', 'Сегодня без спешки закрыла воду, прогулку и тихое утро. Намного легче держать день, когда старт не разваливается.', INTERVAL '4 hour', 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=1200&q=80'),
        ('nastyasts@gmail.com', 'Наконец собрала нормальный обед без сладкой газировки. По ощущениям даже вечер проходит ровнее и без провала по энергии.', INTERVAL '8 hour', 'https://images.unsplash.com/photo-1511690656952-34342bb7c2f2?auto=format&fit=crop&w=1200&q=80'),
        ('irina@healthgame.local', 'Кардио на 20 минут оказалось проще, чем я думала. Главное — не спорить с собой, а просто начать.', INTERVAL '1 day', 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?auto=format&fit=crop&w=1200&q=80'),
        ('maksim@healthgame.local', 'Пять минут дыхания днем реально спасают, когда голова уже начинает шуметь от задач.', INTERVAL '1 day 3 hour', 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&w=1200&q=80'),
        ('alena@healthgame.local', 'Поймала себя на том, что овощной ужин перестал быть “правильной обязанностью” и стал просто удобным выбором.', INTERVAL '2 day', 'https://images.unsplash.com/photo-1490645935967-10de6ba17061?auto=format&fit=crop&w=1200&q=80')
) AS seed(email, text, created_ago, image_url)
JOIN users u ON u.email = seed.email
WHERE NOT EXISTS (
    SELECT 1
    FROM posts p
    WHERE p.author_id = u.id
      AND p.text = seed.text
);

INSERT INTO comments (post_id, author_id, text, created_at, moderation_status)
SELECT p.id,
       u.id,
       seed.text,
       NOW() - seed.created_ago,
       'VISIBLE'
FROM (
    VALUES
        ('Сегодня без спешки закрыла воду, прогулку и тихое утро. Намного легче держать день, когда старт не разваливается.', 'nastyasts@gmail.com', 'Очень нравится эта мысль про спокойный старт. У меня тоже день лучше собирается, если вода закрыта до завтрака.', INTERVAL '3 hour'),
        ('Сегодня без спешки закрыла воду, прогулку и тихое утро. Намного легче держать день, когда старт не разваливается.', 'irina@healthgame.local', 'Да, когда утро не срывается, вечером меньше ощущения, что все уплыло.', INTERVAL '2 hour'),
        ('Наконец собрала нормальный обед без сладкой газировки. По ощущениям даже вечер проходит ровнее и без провала по энергии.', 'a74702784@gmail.com', 'Это очень чувствуется на длинном дне. Газировка дает быстрый всплеск, а потом тяжело.', INTERVAL '7 hour'),
        ('Кардио на 20 минут оказалось проще, чем я думала. Главное — не спорить с собой, а просто начать.', 'maksim@healthgame.local', 'Согласен. Самый сложный шаг — это просто надеть кроссовки.', INTERVAL '22 hour'),
        ('Пять минут дыхания днем реально спасают, когда голова уже начинает шуметь от задач.', 'alena@healthgame.local', 'Хочу добавить это в свой дневной блок, звучит очень жизненно.', INTERVAL '20 hour'),
        ('Поймала себя на том, что овощной ужин перестал быть “правильной обязанностью” и стал просто удобным выбором.', 'a74702784@gmail.com', 'Это лучший момент: когда привычка перестает быть подвигом и становится обычным фоном.', INTERVAL '40 hour')
) AS seed(post_text, email, text, created_ago)
JOIN posts p ON p.text = seed.post_text
JOIN users u ON u.email = seed.email
WHERE NOT EXISTS (
    SELECT 1
    FROM comments c
    WHERE c.post_id = p.id
      AND c.author_id = u.id
      AND c.text = seed.text
);

INSERT INTO post_reactions (post_id, user_id, reaction, created_at)
SELECT p.id,
       u.id,
       seed.reaction,
       NOW() - seed.created_ago
FROM (
    VALUES
        ('Сегодня без спешки закрыла воду, прогулку и тихое утро. Намного легче держать день, когда старт не разваливается.', 'nastyasts@gmail.com', 'fire', INTERVAL '3 hour'),
        ('Сегодня без спешки закрыла воду, прогулку и тихое утро. Намного легче держать день, когда старт не разваливается.', 'irina@healthgame.local', 'clap', INTERVAL '2 hour'),
        ('Сегодня без спешки закрыла воду, прогулку и тихое утро. Намного легче держать день, когда старт не разваливается.', 'maksim@healthgame.local', 'like', INTERVAL '1 hour'),
        ('Наконец собрала нормальный обед без сладкой газировки. По ощущениям даже вечер проходит ровнее и без провала по энергии.', 'a74702784@gmail.com', 'like', INTERVAL '6 hour'),
        ('Наконец собрала нормальный обед без сладкой газировки. По ощущениям даже вечер проходит ровнее и без провала по энергии.', 'alena@healthgame.local', 'fire', INTERVAL '5 hour'),
        ('Кардио на 20 минут оказалось проще, чем я думала. Главное — не спорить с собой, а просто начать.', 'nastyasts@gmail.com', 'clap', INTERVAL '20 hour'),
        ('Пять минут дыхания днем реально спасают, когда голова уже начинает шуметь от задач.', 'a74702784@gmail.com', 'like', INTERVAL '18 hour'),
        ('Поймала себя на том, что овощной ужин перестал быть “правильной обязанностью” и стал просто удобным выбором.', 'maksim@healthgame.local', 'fire', INTERVAL '37 hour')
) AS seed(post_text, email, reaction, created_ago)
JOIN posts p ON p.text = seed.post_text
JOIN users u ON u.email = seed.email
WHERE NOT EXISTS (
    SELECT 1
    FROM post_reactions pr
    WHERE pr.post_id = p.id
      AND pr.user_id = u.id
);

INSERT INTO friendships (requester_id, addressee_id, status, created_at, responded_at)
SELECT requester.id, addressee.id, 'ACCEPTED', NOW() - INTERVAL '7 day', NOW() - INTERVAL '7 day'
FROM (
    VALUES
        ('a74702784@gmail.com', 'nastyasts@gmail.com'),
        ('a74702784@gmail.com', 'irina@healthgame.local'),
        ('nastyasts@gmail.com', 'maksim@healthgame.local'),
        ('irina@healthgame.local', 'alena@healthgame.local')
) AS seed(requester_email, addressee_email)
JOIN users requester ON requester.email = seed.requester_email
JOIN users addressee ON addressee.email = seed.addressee_email
WHERE NOT EXISTS (
    SELECT 1
    FROM friendships f
    WHERE f.requester_id = requester.id
      AND f.addressee_id = addressee.id
);

INSERT INTO user_achievements (user_id, achievement_id, awarded_at, source, context_json)
SELECT u.id, a.id, NOW() - seed.awarded_ago, seed.source, '{}'::jsonb
FROM (
    VALUES
        ('a74702784@gmail.com', 'FIRST_CHECKIN', 'HABIT', INTERVAL '6 day'),
        ('a74702784@gmail.com', 'STREAK_SPARK', 'HABIT', INTERVAL '1 day'),
        ('nastyasts@gmail.com', 'CHALLENGE_JOINER', 'CHALLENGE', INTERVAL '2 day'),
        ('irina@healthgame.local', 'SOCIAL_HEART', 'ADMIN', INTERVAL '10 hour'),
        ('maksim@healthgame.local', 'FOCUS_MASTER', 'ADMIN', INTERVAL '4 hour')
    ) AS seed(email, achievement_code, source, awarded_ago)
JOIN users u ON u.email = seed.email
JOIN achievements a ON a.code = seed.achievement_code
WHERE NOT EXISTS (
    SELECT 1
    FROM user_achievements ua
    WHERE ua.user_id = u.id
      AND ua.achievement_id = a.id
);

INSERT INTO notifications (recipient_id, type, title, message, is_read, created_at, link_json)
SELECT u.id, seed.type, seed.title, seed.message, FALSE, NOW() - seed.created_ago, '{}'::jsonb
FROM (
    VALUES
        ('a74702784@gmail.com', 'daily_score', 'День собран', 'Сегодня у вас уже хороший темп. Осталась ещё одна привычка, чтобы закрыть день чисто.', INTERVAL '2 hour'),
        ('nastyasts@gmail.com', 'challenge_invite', 'Новый челлендж ждёт', 'Вас уже тянут в движение: откройте раздел челленджей и подключайтесь к новой серии.', INTERVAL '5 hour'),
        ('irina@healthgame.local', 'achievement', 'Новое достижение', 'Вы получили достижение «Сердце сообщества». Ваши публикации реально поддерживают других.', INTERVAL '11 hour')
    ) AS seed(email, type, title, message, created_ago)
JOIN users u ON u.email = seed.email
WHERE NOT EXISTS (
    SELECT 1
    FROM notifications n
    WHERE n.recipient_id = u.id
      AND n.title = seed.title
      AND n.message = seed.message
);
