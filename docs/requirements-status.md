# Матрица требований и текущий статус

Ниже зафиксирован реалистичный статус проекта HealthGame на текущий момент. Цель — выйти минимум на 80% требований без ухода в микросервисную сложность и сохранить проект как модульный монолит на Spring Boot + React.

| Блок требований | Статус | Что уже есть | Что еще добить |
|---|---|---|---|
| Backend на Spring + Java | Да | Spring Boot 3.2, Java 21, REST API | Поддерживать единый стиль слоев |
| Frontend как SPA | Да | React 18 + TypeScript + Vite | Дожать UX и структуру страниц |
| Разделение backend/frontend | Да | Отдельные папки `backend/` и `frontend/` | Зафиксировать это в записке |
| HTTP/JSON взаимодействие | Да | Axios + Spring REST controllers | — |
| Docker / Docker Compose | Да | Есть `Dockerfile` и `docker-compose.yml` | По желанию добавить README-команды |
| RESTful API | Да | GET/POST/PUT/DELETE, versioning `/api/v1` | PATCH не обязателен |
| Пагинация | Да | `Pageable` + обработка на клиенте | Дожать фильтрацию/сортировку |
| PostgreSQL | Да | PostgreSQL 15 | — |
| Redis | Да | Redis подключен | Желательно показать практическое использование в записке |
| Минимум 8 связанных таблиц | Да | Таблиц значительно больше 8 | — |
| Flyway / миграции | Да | `V1..V5` миграции | Продолжать все изменения через миграции |
| JWT + Spring Security | Да | Access/refresh tokens, stateless security | Расширить method-level security по желанию |
| DTO / record | Да | Много `record` DTO | — |
| Optional | Да | Используется в repository слое | — |
| Custom exceptions | Да | `DomainException`, `ConflictException`, `ResourceNotFoundException` | — |
| SOLID | Частично/улучшено | Модули, thin controllers, вынесенные стратегии и обработчики событий уже есть | Дальше дробить самые жирные service/page классы |
| DRY / KISS / YAGNI | Частично | Базово соблюдаются | Уменьшить перегруженность frontend-страниц |
| Builder pattern | Да | `ChallengeDetailsResponseBuilder` собирает сложный DTO челленджа | Зафиксировать в записке и UML/описании архитектуры |
| Reflection / custom annotations | Да | Добавлены `@AuditAction` и `AuditTrailService` с reflection-based чтением аннотации | Расширить на 1-2 дополнительных бизнес-операции по желанию |
| Stream API / lambdas | Да | Активно используются в service-слое | — |
| Spring Data JDBC / JdbcTemplate | Частично | Есть `UserRoleJdbcRepository` | Добавить 1-2 осмысленных кастомных запроса |
| Интеграции | Нет/частично | Каркас модуля `integrations` есть | Обязательно добавить минимум 2 реальные интеграции |
| Мониторинг и логгирование | Частично | Actuator dependency есть, точечное логгирование добавляется | Открыть health/info и описать в записке |
| 15 high-level use cases | Почти да | Auth, habits, challenges, achievements, community уже дают базу | Формально выписать список use case |
| OpenAPI / API documentation | Да | SpringDoc OpenAPI / Swagger | — |
| Тесты JUnit / Mockito | Нет/слабо | Есть только базовый контекст-тест | Добавить 2-3 unit/integration сценария |
| CI/CD / статанализ | Нет | Пока не настроены | Необязательно, но можно как бонус |

## Рекомендуемый план на 80%+

1. Оставить архитектуру как модульный монолит.
2. Добить обязательные интеграции.
3. Добавить точечное логгирование и Actuator.
4. Зафиксировать Builder, Strategy, Factory и Observer в записке.
5. Добавить 2-3 тестовых сценария на ключевую бизнес-логику.
6. Описать минимум 15 high-level use case в записке.
7. По возможности добавить простую кастомную аннотацию с reflection-based обработкой.

## Что не стоит форсить сейчас

- Полноценные микросервисы
- gRPC между сервисами
- GraphQL
- WebSocket
- Полный CQRS/Event Sourcing
- Глубокий DevOps-слой

## Что уже добавлено по паттернам

- Builder: [ChallengeDetailsResponseBuilder](../backend/src/main/java/com/healthgame/backend/challenges/application/ChallengeDetailsResponseBuilder.java)
- Strategy: стратегии расчета прогресса и сопоставления целей челленджа в challenge/application/progress`r
- Factory: [ChallengeGoalProgressStrategyFactory](../backend/src/main/java/com/healthgame/backend/challenges/application/progress/ChallengeGoalProgressStrategyFactory.java) и [ChallengeTargetMatchingStrategyFactory](../backend/src/main/java/com/healthgame/backend/challenges/application/progress/ChallengeTargetMatchingStrategyFactory.java)
- Observer: события [HabitCheckinCreatedEvent](../backend/src/main/java/com/healthgame/backend/achievements/application/events/HabitCheckinCreatedEvent.java), [ChallengeJoinedEvent](../backend/src/main/java/com/healthgame/backend/achievements/application/events/ChallengeJoinedEvent.java) и обработчик [AchievementEventListener](../backend/src/main/java/com/healthgame/backend/achievements/application/events/AchievementEventListener.java)
- Facade: крупные application service по-прежнему выступают фасадами над persistence и доменной логикой, но их еще стоит дробить для лучшего SOLID.
