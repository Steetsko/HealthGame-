# Запуск проекта HealthGame

Этот файл описывает, что нужно установить и как пошагово запустить проект.

## 1. Структура проекта

Проект состоит из трех частей:

- `backend` — Spring Boot REST API
- `frontend` — React SPA
- `infra` — Docker Compose для PostgreSQL, Redis и общего запуска

Основные файлы:

- `backend/pom.xml`
- `backend/src/main/resources/application.yml`
- `backend/src/main/resources/db/migration/V1__init_schema.sql`
- `frontend/package.json`
- `infra/docker-compose.yml`

## 2. Что нужно установить

Для полноценного запуска проекта нужны:

### Обязательно

1. Java 21
2. Maven 3.9+
3. Node.js 20+ или 22+
4. npm
5. Docker Desktop
6. Docker Compose plugin

### Рекомендуется

1. IntelliJ IDEA
2. DBeaver или pgAdmin для просмотра PostgreSQL
3. Postman или Bruno для тестирования API

## 3. Как проверить, что все установлено

Откройте PowerShell и выполните:

```powershell
java -version
mvn -version
node -v
npm -v
docker --version
docker compose version
```

Ожидаемый результат:

- Java показывает версию 21
- Maven доступен из консоли
- Node.js установлен
- Docker работает без ошибок

Если какая-то команда не найдена, сначала нужно установить соответствующий инструмент и добавить его в `PATH`.

## 4. Что делает Docker в этом проекте

Docker используется для запуска:

- PostgreSQL
- Redis
- backend
- frontend

Это уже описано в файле:

- `infra/docker-compose.yml`

То есть проект можно запустить полностью контейнерами.

## 5. Параметры базы данных

По текущей конфигурации используются такие параметры PostgreSQL:

- Host: `localhost`
- Port: `5432`
- Database: `healthgame`
- Username: `healthgame`
- Password: `healthgame`

JDBC URL:

```text
jdbc:postgresql://localhost:5432/healthgame
```

Внутри Docker backend подключается к PostgreSQL по имени сервиса:

```text
jdbc:postgresql://postgres:5432/healthgame
```

## 6. Как создается схема БД

Схема БД создается автоматически через Flyway при старте backend.

Используется миграция:

- `backend/src/main/resources/db/migration/V1__init_schema.sql`

Это значит:

- вручную SQL запускать не нужно
- при старте backend таблицы создаются автоматически
- если база уже была создана раньше, Flyway проверит историю миграций

## 7. Самый простой запуск: полностью через Docker

Это основной рекомендуемый способ для демонстрации проекта.

### Шаг 1. Запустить Docker Desktop

Перед запуском команд убедитесь, что Docker Desktop действительно открыт и полностью стартовал.

### Шаг 1.1. Создать файл переменных окружения

В папке `infra` создайте файл `.env` на основе шаблона:

```powershell
cd "d:\Универ\3 курс\6 семестр\курсач рис\game\infra"
copy .env.example .env
```

После этого откройте `infra/.env` и заполните:

- `JWT_SECRET`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`

Для Google Cloud redirect URI должен быть таким:

```text
http://localhost:8080/login/oauth2/code/google
```
### Шаг 2. Перейти в папку с docker-compose

```powershell
cd "d:\Универ\3 курс\6 семестр\курсач рис\game\infra"
```

### Шаг 3. Собрать и запустить проект

```powershell
docker compose up --build
```

Что произойдет:

1. Будет поднят PostgreSQL
2. Будет поднят Redis
3. Будет собран backend Docker image
4. Будет собран frontend Docker image
5. Приложение станет доступно локально

### Шаг 4. Проверить доступность сервисов

После запуска должны быть доступны:

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:8080`
- Health endpoint: `http://localhost:8080/actuator/health`
- Swagger UI: `http://localhost:8080/swagger-ui`
- OpenAPI: `http://localhost:8080/api-docs`

### Шаг 5. Остановить проект

```powershell
docker compose down
```

### Шаг 6. Остановить проект и удалить данные БД

Если нужно удалить volume PostgreSQL и начать с чистой базы:

```powershell
docker compose down -v
```

Важно: команда `down -v` удалит сохраненные данные PostgreSQL.

## 8. Режим для разработки: БД и Redis в Docker, backend/frontend локально

Этот режим удобен, если вы хотите разрабатывать код локально и быстро перезапускать backend/frontend.

### Шаг 1. Поднять только PostgreSQL и Redis

```powershell
cd "d:\Универ\3 курс\6 семестр\курсач рис\game\infra"
docker compose up postgres redis -d
```

После этого будут доступны:

- PostgreSQL на `localhost:5432`
- Redis на `localhost:6379`

### Шаг 2. Запустить backend локально

```powershell
cd "d:\Универ\3 курс\6 семестр\курсач рис\game\backend"
mvn spring-boot:run
```

Backend возьмет параметры подключения из:

- `backend/src/main/resources/application.yml`

Локально используются:

- DB URL: `jdbc:postgresql://localhost:5432/healthgame`
- DB user: `healthgame`
- DB password: `healthgame`
- Redis host: `localhost`
- Redis port: `6379`

### Шаг 3. Проверить backend

Откройте:

- `http://localhost:8080/actuator/health`
- `http://localhost:8080/swagger-ui`

Если backend стартовал нормально, значит:

- подключение к БД работает
- Flyway миграция применена
- Spring Boot приложение поднялось

### Шаг 4. Запустить frontend локально

```powershell
cd "d:\Универ\3 курс\6 семестр\курсач рис\game\frontend"
npm install
npm run dev
```

Frontend будет доступен на:

- `http://localhost:5173`

## 9. Как подключиться к базе данных вручную

Если хотите открыть базу в DBeaver, pgAdmin или IntelliJ Database Tools, используйте:

- Host: `localhost`
- Port: `5432`
- Database: `healthgame`
- Username: `healthgame`
- Password: `healthgame`

Строка подключения:

```text
jdbc:postgresql://localhost:5432/healthgame
```

## 10. Как проверить, что таблицы действительно создались

Подключитесь к PostgreSQL через DBeaver или pgAdmin и выполните:

```sql
select table_name
from information_schema.tables
where table_schema = 'public'
order by table_name;
```

Вы должны увидеть таблицы вроде:

- `users`
- `roles`
- `habits`
- `habit_checkins`
- `challenges`
- `challenge_participants`
- `achievements`
- `user_achievements`
- `notifications`
- `external_integrations`
- `refresh_tokens`
- `friendships`
- `challenge_targets`
- `challenge_progress`

## 11. Что делать, если порт уже занят

Если проект не стартует, проблема часто в занятых портах:

- `5432` — PostgreSQL
- `6379` — Redis
- `8080` — backend
- `5173` — frontend

Проверка на Windows:

```powershell
netstat -ano | findstr :5432
netstat -ano | findstr :6379
netstat -ano | findstr :8080
netstat -ano | findstr :5173
```

Если порт занят другим процессом, нужно:

1. либо остановить этот процесс
2. либо поменять порт в конфигурации

## 12. Типовые проблемы и причины

### Проблема: `java` не найдена
Причина:
- Java не установлена или не добавлена в `PATH`

### Проблема: `mvn` не найдена
Причина:
- Maven не установлен или не добавлен в `PATH`

### Проблема: `docker compose` не работает
Причина:
- Docker Desktop не запущен
- Compose plugin недоступен

### Проблема: backend не может подключиться к БД
Причина:
- PostgreSQL не поднят
- неверный `DB_URL`
- порт `5432` занят другой БД

### Проблема: frontend стартует, но API недоступен
Причина:
- backend не запущен
- backend упал на миграции или подключении к БД

### Проблема: Flyway падает на старте
Причина:
- БД уже была создана в другом состоянии
- структура не совпадает с текущей миграцией

Решение для dev-режима:

1. остановить контейнеры
2. удалить volume БД
3. поднять инфраструктуру заново

```powershell
cd "d:\Универ\3 курс\6 семестр\курсач рис\game\infra"
docker compose down -v
docker compose up postgres redis -d
```

## 13. Рекомендуемый сценарий лично для вас

Для ежедневной разработки:

1. Запустить Docker Desktop
2. Выполнить:

```powershell
cd "d:\Универ\3 курс\6 семестр\курсач рис\game\infra"
docker compose up postgres redis -d
```

3. В отдельной консоли запустить backend:

```powershell
cd "d:\Универ\3 курс\6 семестр\курсач рис\game\backend"
mvn spring-boot:run
```

4. В еще одной консоли запустить frontend:

```powershell
cd "d:\Универ\3 курс\6 семестр\курсач рис\game\frontend"
npm install
npm run dev
```

Для демонстрации преподавателю:

```powershell
cd "d:\Универ\3 курс\6 семестр\курсач рис\game\infra"
docker compose up --build
```

## 14. Что еще важно понимать

На текущем этапе проектный каркас уже создан, но бизнес-функции реализованы пока частично.

Сейчас реально подготовлены:

- структура backend
- структура frontend
- базовая security-конфигурация
- auth skeleton
- миграция БД
- docker-compose

То есть инструкция запуска уже актуальна для инфраструктуры и каркаса проекта.

Когда будут добавляться новые модули, способ запуска останется тем же.

## 11. Как включить вход через Google

В проект добавлена OAuth2 / OpenID Connect интеграция с Google.

Что уже реализовано:

- вход через Google на странице логина
- выдача локальной JWT-пары после успешной авторизации Google
- сохранение внешней интеграции в БД
- чтение ближайших событий из Google Calendar

### Что нужно сделать в Google Cloud Console

1. Создать OAuth Client ID для Web application
2. Добавить redirect URI:

```text
http://localhost:8080/login/oauth2/code/google
```

3. Скопировать значения:

- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`

### Как передать настройки локально

Для Docker Compose используются переменные:

- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `FRONTEND_BASE_URL`

По умолчанию в `infra/docker-compose.yml` стоят заглушки. Перед демонстрацией их нужно заменить на реальные значения.

### Что проверить после запуска

1. Открыть `http://localhost:5173/login`
2. Нажать `Войти через Google`
3. После успешного входа убедиться, что произошел переход в приложение
4. Открыть `Настройки` и проверить блок Google Calendar