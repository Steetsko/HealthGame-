INSERT INTO users (email, phone, password_hash, nickname, first_name, timezone, status, avatar_url, registered_at, last_login_at)
VALUES
    ('denis@healthgame.local', '+375291110044', '$2a$10$IDYz7FTzfKiftzPGItuMHuzOgaEhK28/IF8I1IVGPClhGp7z2MIK.', 'denis_move', 'Денис', 'Europe/Minsk', 'active', 'https://randomuser.me/api/portraits/men/41.jpg', NOW() - INTERVAL '9 day', NOW() - INTERVAL '4 hour'),
    ('polina@healthgame.local', '+375291110055', '$2a$10$IDYz7FTzfKiftzPGItuMHuzOgaEhK28/IF8I1IVGPClhGp7z2MIK.', 'polina_glow', 'Полина', 'Europe/Minsk', 'active', 'https://randomuser.me/api/portraits/women/52.jpg', NOW() - INTERVAL '8 day', NOW() - INTERVAL '6 hour'),
    ('sergey@healthgame.local', '+375291110066', '$2a$10$IDYz7FTzfKiftzPGItuMHuzOgaEhK28/IF8I1IVGPClhGp7z2MIK.', 'sergey_core', 'Сергей', 'Europe/Minsk', 'active', 'https://randomuser.me/api/portraits/men/57.jpg', NOW() - INTERVAL '7 day', NOW() - INTERVAL '9 hour')
ON CONFLICT (email) DO NOTHING;

INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id
FROM users u
JOIN roles r ON r.code = 'ROLE_USER'
WHERE u.email IN ('denis@healthgame.local', 'polina@healthgame.local', 'sergey@healthgame.local')
ON CONFLICT DO NOTHING;

INSERT INTO achievements (code, name, description, icon, rarity, is_active)
VALUES
    ('MORNING_PULSE', 'Утренний импульс', 'Три утра подряд начинаются без пропуска ключевой привычки', 'sunrise', 'rare', TRUE),
    ('WATER_GUARD', 'Хранитель воды', 'Питьевой ритм держится уверенно всю неделю', 'droplets', 'epic', TRUE),
    ('CHALLENGE_FINISHER', 'Финишер челленджа', 'Челлендж доведен до конца без слива на полпути', 'flag', 'epic', TRUE)
ON CONFLICT (code) DO NOTHING;

INSERT INTO habits (user_id, category_id, name, description, start_date, end_date, target_value, unit, frequency, is_active)
SELECT u.id, c.id, seed.name, seed.description, CURRENT_DATE - 9, NULL, seed.target_value, seed.unit, 'DAILY', TRUE
FROM (
    VALUES
        ('denis@healthgame.local', 'Activity', 'Зарядка 12 минут', 'Короткая бодрая зарядка без перегруза перед делами.', 12, 'min'),
        ('denis@healthgame.local', 'Hydration', 'Литр воды до обеда', 'Закрыть первую половину питьевого плана к середине дня.', 1, 'times'),
        ('polina@healthgame.local', 'Mindfulness', 'Тихий вечер 10 минут', 'Без уведомлений и шума перед сном.', 10, 'min'),
        ('polina@healthgame.local', 'Nutrition', 'Белковый завтрак', 'Собранный завтрак, который не проваливает энергию к полудню.', 1, 'times'),
        ('sergey@healthgame.local', 'Sleep', 'Подъем без snooze', 'Встать по первому будильнику и не растягивать старт дня.', 1, 'times'),
        ('sergey@healthgame.local', 'Activity', 'Растяжка после работы', 'Разгрузить спину и шею после долгого сидения.', 15, 'min')
) AS seed(email, category_name, name, description, target_value, unit)
JOIN users u ON u.email = seed.email
JOIN habit_categories c ON c.name = seed.category_name
WHERE NOT EXISTS (
    SELECT 1
    FROM habits h
    WHERE h.user_id = u.id
      AND h.name = seed.name
);

INSERT INTO habit_schedules (habit_id, day_of_week, time_of_day, min_times_per_day, is_enabled)
SELECT h.id, s.day_of_week, s.time_of_day, s.min_times_per_day, TRUE
FROM habits h
JOIN (
    VALUES
        ('Зарядка 12 минут', 1, '07:20'::time, 1),
        ('Зарядка 12 минут', 2, '07:20'::time, 1),
        ('Зарядка 12 минут', 3, '07:20'::time, 1),
        ('Зарядка 12 минут', 4, '07:20'::time, 1),
        ('Зарядка 12 минут', 5, '07:20'::time, 1),
        ('Литр воды до обеда', 1, '11:30'::time, 1),
        ('Литр воды до обеда', 2, '11:30'::time, 1),
        ('Литр воды до обеда', 3, '11:30'::time, 1),
        ('Литр воды до обеда', 4, '11:30'::time, 1),
        ('Литр воды до обеда', 5, '11:30'::time, 1),
        ('Тихий вечер 10 минут', 1, '22:10'::time, 1),
        ('Тихий вечер 10 минут', 2, '22:10'::time, 1),
        ('Тихий вечер 10 минут', 3, '22:10'::time, 1),
        ('Тихий вечер 10 минут', 4, '22:10'::time, 1),
        ('Тихий вечер 10 минут', 5, '22:10'::time, 1),
        ('Белковый завтрак', 1, '08:15'::time, 1),
        ('Белковый завтрак', 2, '08:15'::time, 1),
        ('Белковый завтрак', 3, '08:15'::time, 1),
        ('Белковый завтрак', 4, '08:15'::time, 1),
        ('Белковый завтрак', 5, '08:15'::time, 1),
        ('Подъем без snooze', 1, '06:50'::time, 1),
        ('Подъем без snooze', 2, '06:50'::time, 1),
        ('Подъем без snooze', 3, '06:50'::time, 1),
        ('Подъем без snooze', 4, '06:50'::time, 1),
        ('Подъем без snooze', 5, '06:50'::time, 1),
        ('Растяжка после работы', 1, '19:10'::time, 1),
        ('Растяжка после работы', 2, '19:10'::time, 1),
        ('Растяжка после работы', 3, '19:10'::time, 1),
        ('Растяжка после работы', 4, '19:10'::time, 1),
        ('Растяжка после работы', 5, '19:10'::time, 1)
) AS s(habit_name, day_of_week, time_of_day, min_times_per_day)
  ON s.habit_name = h.name
WHERE NOT EXISTS (
    SELECT 1
    FROM habit_schedules hs
    WHERE hs.habit_id = h.id
      AND hs.day_of_week = s.day_of_week
      AND hs.time_of_day = s.time_of_day
);

INSERT INTO habit_checkins (habit_id, checkin_date, value, comment, source)
SELECT h.id,
       gs::date,
       CASE
           WHEN h.unit = 'min' THEN h.target_value
           ELSE h.target_value
       END,
       CASE h.name
           WHEN 'Зарядка 12 минут' THEN 'Разогнал тело и голову перед делами.'
           WHEN 'Литр воды до обеда' THEN 'Вода закрыта ещё до обеда, дальше день идёт легче.'
           WHEN 'Тихий вечер 10 минут' THEN 'Спокойное завершение дня без шума.'
           WHEN 'Белковый завтрак' THEN 'Завтрак собрал энергию на первую половину дня.'
           WHEN 'Подъем без snooze' THEN 'Старт без торга с будильником.'
           WHEN 'Растяжка после работы' THEN 'Спина и плечи сказали спасибо.'
           ELSE 'Привычка выполнена.'
       END,
       'manual'
FROM habits h
JOIN users u ON u.id = h.user_id
JOIN generate_series(CURRENT_DATE - INTERVAL '6 day', CURRENT_DATE, INTERVAL '1 day') gs ON TRUE
WHERE (
        (u.email = 'denis@healthgame.local' AND h.name = 'Зарядка 12 минут' AND gs::date IN (CURRENT_DATE - 6, CURRENT_DATE - 5, CURRENT_DATE - 4, CURRENT_DATE - 2, CURRENT_DATE - 1))
     OR (u.email = 'denis@healthgame.local' AND h.name = 'Литр воды до обеда' AND gs::date IN (CURRENT_DATE - 6, CURRENT_DATE - 5, CURRENT_DATE - 3, CURRENT_DATE - 2, CURRENT_DATE))
     OR (u.email = 'polina@healthgame.local' AND h.name = 'Тихий вечер 10 минут' AND gs::date IN (CURRENT_DATE - 6, CURRENT_DATE - 4, CURRENT_DATE - 3, CURRENT_DATE - 2, CURRENT_DATE))
     OR (u.email = 'polina@healthgame.local' AND h.name = 'Белковый завтрак' AND gs::date IN (CURRENT_DATE - 6, CURRENT_DATE - 5, CURRENT_DATE - 4, CURRENT_DATE - 1, CURRENT_DATE))
     OR (u.email = 'sergey@healthgame.local' AND h.name = 'Подъем без snooze' AND gs::date IN (CURRENT_DATE - 6, CURRENT_DATE - 5, CURRENT_DATE - 4, CURRENT_DATE - 3, CURRENT_DATE - 2, CURRENT_DATE - 1))
     OR (u.email = 'sergey@healthgame.local' AND h.name = 'Растяжка после работы' AND gs::date IN (CURRENT_DATE - 5, CURRENT_DATE - 4, CURRENT_DATE - 2, CURRENT_DATE))
    )
  AND NOT EXISTS (
    SELECT 1
    FROM habit_checkins hc
    WHERE hc.habit_id = h.id
      AND hc.checkin_date = gs::date
  );

INSERT INTO challenges (creator_id, name, description, start_date, end_date, goal_type, goal_value, status, is_public, moderation_status, cover_image_url)
SELECT u.id, seed.name, seed.description, seed.start_date, seed.end_date, seed.goal_type, seed.goal_value, 'ACTIVE', TRUE, 'VISIBLE', seed.cover_image_url
FROM (
    VALUES
        ('denis@healthgame.local', 'Чистое утро без рывков', 'Собираем первые 90 минут дня без хаоса: вода, движение и спокойный старт.', CURRENT_DATE - 2, CURRENT_DATE + 9, 'STREAK', 6, 'https://images.unsplash.com/photo-1498837167922-ddd27525d352?auto=format&fit=crop&w=1200&q=80'),
        ('polina@healthgame.local', 'Неделя мягкого сна', 'Собираем ровный вечерний ритм: меньше шума, стабильнее сон, легче утро.', CURRENT_DATE - 1, CURRENT_DATE + 10, 'DAYS_COUNT', 7, 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1200&q=80'),
        ('sergey@healthgame.local', 'Офис без деревянной спины', 'Каждый день двигаемся после работы, чтобы не слипаться в кресле.', CURRENT_DATE, CURRENT_DATE + 12, 'SUM_VALUE', 60, 'https://images.unsplash.com/photo-1518611012118-696072aa579a?auto=format&fit=crop&w=1200&q=80')
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
        ('Чистое утро без рывков', 'Mindfulness'),
        ('Неделя мягкого сна', 'Sleep'),
        ('Офис без деревянной спины', 'Activity')
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
       NOW() - INTERVAL '12 hour',
       c.creator_id,
       NOW() - INTERVAL '1 day',
       NOW() - INTERVAL '12 hour'
FROM challenges c
JOIN users u ON u.email IN (
    CASE c.name
        WHEN 'Чистое утро без рывков' THEN 'denis@healthgame.local'
        WHEN 'Неделя мягкого сна' THEN 'polina@healthgame.local'
        WHEN 'Офис без деревянной спины' THEN 'sergey@healthgame.local'
    END,
    CASE c.name
        WHEN 'Чистое утро без рывков' THEN 'a74702784@gmail.com'
        WHEN 'Неделя мягкого сна' THEN 'irina@healthgame.local'
        WHEN 'Офис без деревянной спины' THEN 'maksim@healthgame.local'
    END,
    CASE c.name
        WHEN 'Чистое утро без рывков' THEN 'polina@healthgame.local'
        WHEN 'Неделя мягкого сна' THEN 'alena@healthgame.local'
        WHEN 'Офис без деревянной спины' THEN 'denis@healthgame.local'
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
           WHEN c.name = 'Чистое утро без рывков' AND u.email = 'denis@healthgame.local' THEN 4
           WHEN c.name = 'Чистое утро без рывков' AND u.email = 'a74702784@gmail.com' THEN 5
           WHEN c.name = 'Чистое утро без рывков' AND u.email = 'polina@healthgame.local' THEN 3
           WHEN c.name = 'Неделя мягкого сна' AND u.email = 'polina@healthgame.local' THEN 4
           WHEN c.name = 'Неделя мягкого сна' AND u.email = 'irina@healthgame.local' THEN 5
           WHEN c.name = 'Неделя мягкого сна' AND u.email = 'alena@healthgame.local' THEN 3
           WHEN c.name = 'Офис без деревянной спины' AND u.email = 'sergey@healthgame.local' THEN 26
           WHEN c.name = 'Офис без деревянной спины' AND u.email = 'maksim@healthgame.local' THEN 22
           WHEN c.name = 'Офис без деревянной спины' AND u.email = 'denis@healthgame.local' THEN 18
           ELSE 1
       END,
       CASE
           WHEN c.name = 'Чистое утро без рывков' AND u.email = 'denis@healthgame.local' THEN 66.67
           WHEN c.name = 'Чистое утро без рывков' AND u.email = 'a74702784@gmail.com' THEN 83.33
           WHEN c.name = 'Чистое утро без рывков' AND u.email = 'polina@healthgame.local' THEN 50.00
           WHEN c.name = 'Неделя мягкого сна' AND u.email = 'polina@healthgame.local' THEN 57.14
           WHEN c.name = 'Неделя мягкого сна' AND u.email = 'irina@healthgame.local' THEN 71.43
           WHEN c.name = 'Неделя мягкого сна' AND u.email = 'alena@healthgame.local' THEN 42.86
           WHEN c.name = 'Офис без деревянной спины' AND u.email = 'sergey@healthgame.local' THEN 43.33
           WHEN c.name = 'Офис без деревянной спины' AND u.email = 'maksim@healthgame.local' THEN 36.67
           WHEN c.name = 'Офис без деревянной спины' AND u.email = 'denis@healthgame.local' THEN 30.00
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
SELECT u.id, 'TEXT', seed.text, 'PUBLIC', NOW() - seed.created_ago, seed.image_url, NULL, 'VISIBLE'
FROM (
    VALUES
        ('denis@healthgame.local', 'Сегодня впервые закрыл утро без рывков: зарядка, вода и никакого хаоса до девяти. Ощущения вообще другие.', INTERVAL '2 hour', 'https://images.unsplash.com/photo-1494390248081-4e521a5940db?auto=format&fit=crop&w=1200&q=80'),
        ('polina@healthgame.local', 'Сон начал выравниваться не из-за силы воли, а из-за тихого вечера. Удивительно, как много решают 10 спокойных минут.', INTERVAL '6 hour', 'https://images.unsplash.com/photo-1511295742362-92c96b1cf484?auto=format&fit=crop&w=1200&q=80'),
        ('sergey@healthgame.local', 'Растяжка после работы кажется мелочью, но спина реально перестала быть каменной к ночи.', INTERVAL '9 hour', 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&w=1200&q=80'),
        ('a74702784@gmail.com', 'Сегодняшний дневной рейтинг вытянула прогулка. Думала пропущу, а в итоге именно она собрала голову.', INTERVAL '13 hour', 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=80'),
        ('irina@healthgame.local', 'Мне нравится, что челленджи здесь не про давление, а про ритм. Намного легче держаться в таком формате.', INTERVAL '1 day 4 hour', 'https://images.unsplash.com/photo-1499750310107-5fef28a66643?auto=format&fit=crop&w=1200&q=80'),
        ('alena@healthgame.local', 'Обычный ужин с овощами почему-то стал якорем дня: если он на месте, дальше всё тоже держится лучше.', INTERVAL '1 day 8 hour', 'https://images.unsplash.com/photo-1473093295043-cdd812d0e601?auto=format&fit=crop&w=1200&q=80')
) AS seed(email, text, created_ago, image_url)
JOIN users u ON u.email = seed.email
WHERE NOT EXISTS (
    SELECT 1
    FROM posts p
    WHERE p.author_id = u.id
      AND p.text = seed.text
);

INSERT INTO comments (post_id, author_id, text, created_at, moderation_status)
SELECT p.id, u.id, seed.text, NOW() - seed.created_ago, 'VISIBLE'
FROM (
    VALUES
        ('Сегодня впервые закрыл утро без рывков: зарядка, вода и никакого хаоса до девяти. Ощущения вообще другие.', 'a74702784@gmail.com', 'Да, утро вообще меняет тон всего дня. Очень понимаю это состояние.', INTERVAL '90 minute'),
        ('Сегодня впервые закрыл утро без рывков: зарядка, вода и никакого хаоса до девяти. Ощущения вообще другие.', 'polina@healthgame.local', 'Хочется тоже попробовать такой сборный старт без телефона.', INTERVAL '70 minute'),
        ('Сон начал выравниваться не из-за силы воли, а из-за тихого вечера. Удивительно, как много решают 10 спокойных минут.', 'irina@healthgame.local', 'Вот это очень точное наблюдение. Иногда решает не дисциплина, а качество торможения вечером.', INTERVAL '5 hour'),
        ('Растяжка после работы кажется мелочью, но спина реально перестала быть каменной к ночи.', 'maksim@healthgame.local', 'Подтверждаю. После рабочего дня именно растяжка спасает от ощущения, что тело застряло в стуле.', INTERVAL '8 hour'),
        ('Сегодняшний дневной рейтинг вытянула прогулка. Думала пропущу, а в итоге именно она собрала голову.', 'denis@healthgame.local', 'Самые полезные прогулки почему-то всегда те, которые почти отменились.', INTERVAL '11 hour'),
        ('Мне нравится, что челленджи здесь не про давление, а про ритм. Намного легче держаться в таком формате.', 'alena@healthgame.local', 'Да, когда атмосфера не давит, хочется не сбегать, а возвращаться.', INTERVAL '1 day'),
        ('Обычный ужин с овощами почему-то стал якорем дня: если он на месте, дальше всё тоже держится лучше.', 'sergey@healthgame.local', 'Очень сильная фраза. Когда в дне есть якорь, всё остальное правда меньше качает.', INTERVAL '30 hour')
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
SELECT p.id, u.id, seed.reaction, NOW() - seed.created_ago
FROM (
    VALUES
        ('Сегодня впервые закрыл утро без рывков: зарядка, вода и никакого хаоса до девяти. Ощущения вообще другие.', 'a74702784@gmail.com', 'fire', INTERVAL '80 minute'),
        ('Сегодня впервые закрыл утро без рывков: зарядка, вода и никакого хаоса до девяти. Ощущения вообще другие.', 'irina@healthgame.local', 'clap', INTERVAL '60 minute'),
        ('Сон начал выравниваться не из-за силы воли, а из-за тихого вечера. Удивительно, как много решают 10 спокойных минут.', 'alena@healthgame.local', 'like', INTERVAL '4 hour'),
        ('Сон начал выравниваться не из-за силы воли, а из-за тихого вечера. Удивительно, как много решают 10 спокойных минут.', 'nastyasts@gmail.com', 'fire', INTERVAL '3 hour'),
        ('Растяжка после работы кажется мелочью, но спина реально перестала быть каменной к ночи.', 'denis@healthgame.local', 'clap', INTERVAL '7 hour'),
        ('Сегодняшний дневной рейтинг вытянула прогулка. Думала пропущу, а в итоге именно она собрала голову.', 'polina@healthgame.local', 'like', INTERVAL '10 hour'),
        ('Мне нравится, что челленджи здесь не про давление, а про ритм. Намного легче держаться в таком формате.', 'sergey@healthgame.local', 'fire', INTERVAL '1 day'),
        ('Обычный ужин с овощами почему-то стал якорем дня: если он на месте, дальше всё тоже держится лучше.', 'maksim@healthgame.local', 'clap', INTERVAL '28 hour')
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
SELECT requester.id, addressee.id, 'ACCEPTED', NOW() - INTERVAL '5 day', NOW() - INTERVAL '5 day'
FROM (
    VALUES
        ('denis@healthgame.local', 'polina@healthgame.local'),
        ('denis@healthgame.local', 'sergey@healthgame.local'),
        ('polina@healthgame.local', 'a74702784@gmail.com'),
        ('sergey@healthgame.local', 'irina@healthgame.local'),
        ('alena@healthgame.local', 'denis@healthgame.local')
    ) AS seed(requester_email, addressee_email)
JOIN users requester ON requester.email = seed.requester_email
JOIN users addressee ON addressee.email = seed.addressee_email
WHERE NOT EXISTS (
    SELECT 1
    FROM friendships f
    WHERE f.requester_id = requester.id
      AND f.addressee_id = addressee.id
);

INSERT INTO notifications (recipient_id, type, title, message, is_read, created_at, link_json)
SELECT u.id, seed.type, seed.title, seed.message, FALSE, NOW() - seed.created_ago, '{}'::jsonb
FROM (
    VALUES
        ('denis@healthgame.local', 'daily_score', 'Утро собрано', 'Вы уже взяли хороший старт дня. Осталось удержать темп до вечера.', INTERVAL '2 hour'),
        ('polina@healthgame.local', 'challenge_invite', 'Спокойный челлендж рядом', 'В разделе челленджей вас ждет новая серия про мягкий сон и устойчивый ритм.', INTERVAL '4 hour'),
        ('sergey@healthgame.local', 'achievement', 'Новый уровень ритма', 'Вы держите темп уже несколько дней подряд. Пора добрать ещё одно чистое закрытие.', INTERVAL '7 hour'),
        ('a74702784@gmail.com', 'social', 'Лента оживает', 'Ваши публикации начали собирать ответы и реакции. Это хороший сигнал для блока сообщества.', INTERVAL '9 hour')
) AS seed(email, type, title, message, created_ago)
JOIN users u ON u.email = seed.email
WHERE NOT EXISTS (
    SELECT 1
    FROM notifications n
    WHERE n.recipient_id = u.id
      AND n.title = seed.title
      AND n.message = seed.message
);

INSERT INTO user_achievements (user_id, achievement_id, awarded_at, source, context_json)
SELECT u.id, a.id, NOW() - seed.awarded_ago, seed.source, '{}'::jsonb
FROM (
    VALUES
        ('denis@healthgame.local', 'MORNING_PULSE', 'HABIT', INTERVAL '3 hour'),
        ('polina@healthgame.local', 'FOCUS_MASTER', 'ADMIN', INTERVAL '5 hour'),
        ('sergey@healthgame.local', 'CHALLENGE_FINISHER', 'CHALLENGE', INTERVAL '1 day'),
        ('alena@healthgame.local', 'WATER_GUARD', 'ADMIN', INTERVAL '2 day')
    ) AS seed(email, achievement_code, source, awarded_ago)
JOIN users u ON u.email = seed.email
JOIN achievements a ON a.code = seed.achievement_code
WHERE NOT EXISTS (
    SELECT 1
    FROM user_achievements ua
    WHERE ua.user_id = u.id
      AND ua.achievement_id = a.id
);
