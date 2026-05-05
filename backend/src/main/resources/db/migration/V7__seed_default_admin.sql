INSERT INTO users (email, phone, password_hash, nickname, first_name, timezone, status)
VALUES ('admin@healthgame.local', NULL, '$2a$10$IDYz7FTzfKiftzPGItuMHuzOgaEhK28/IF8I1IVGPClhGp7z2MIK.', 'system_admin', 'System Admin', 'Europe/Minsk', 'active')
ON CONFLICT (email) DO NOTHING;

INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id
FROM users u
JOIN roles r ON r.code = 'ROLE_USER'
WHERE u.email = 'admin@healthgame.local'
ON CONFLICT DO NOTHING;

INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id
FROM users u
JOIN roles r ON r.code = 'ROLE_ADMIN'
WHERE u.email = 'admin@healthgame.local'
ON CONFLICT DO NOTHING;