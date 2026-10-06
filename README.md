# GTD Task Service — безопасный REST API

Backend сервиса планирования задач по методу GTD (Getting Things Done) с контекстами
(`@home`, `@work`, `@calls`) и напоминаниями. Индивидуальная практическая работа
«Разработка безопасного REST API»: аутентификация по JWT, ролевая модель
`user` / `moderator` / `admin` и защита от типовых угроз OWASP API Top 10.

## Стек

| Слой | Технология |
|---|---|
| HTTP | Node.js ≥ 20, Express 5 |
| БД | PostgreSQL 16 (Docker), Sequelize 6 |
| Аутентификация | jsonwebtoken (HS256), bcrypt (12 раундов) |
| Валидация | Joi — для `params`, `query` и `body` каждого маршрута |
| Защита | helmet, cors, express-rate-limit, sanitize-html |
| Журналирование | winston + winston-daily-rotate-file |
| Документация | API.md, OpenAPI 3 (`docs/openapi.json`) + Swagger UI на `/api-docs` |

## Структура

```
src/
  config/        env.js — все переменные окружения в одном месте; database.js — Sequelize
  models/        User, RefreshToken, Context, Task и связи между ними
  services/      бизнес-логика: auth, token, user, context, task, accessPolicy
  controllers/   тонкие обработчики HTTP: читают req.validated, вызывают сервис
  routes/        маршруты и цепочки middleware; docs.routes.js — Swagger UI
  middleware/    authenticate, roleGuard, validate, requireJson, sanitizeBody,
                 rateLimiters, cors, requestLogger, errorHandler
  validators/    Joi-схемы и русские сообщения об ошибках
  utils/         иерархия AppError, логгеры, токены, пароли, роли, санитизация
  app.js         фабрика Express-приложения
  server.js      запуск: подключение к БД, sync, listen, graceful shutdown
scripts/seed.js  создание admin/moderator/user из переменных окружения
docs/openapi.json  спецификация OpenAPI 3.0 для Swagger UI
postman/         коллекция Postman v2.1 со всеми сценариями
docker-compose.yml  PostgreSQL
```

## Запуск

```bash
cp .env.example .env
# сгенерировать секреты и вставить в JWT_SECRET и JWT_REFRESH_SECRET:
openssl rand -hex 32
openssl rand -hex 32

npm install
docker compose up -d        # PostgreSQL на 127.0.0.1:5432
npm run seed                # admin, moderator, user + демо-контексты и задачи
npm start                   # http://localhost:3000
```

После запуска:

- `GET http://localhost:3000/health` — проверка доступности;
- `http://localhost:3000/api-docs` — Swagger UI, спецификация: `/api-docs/openapi.json`;
- журналы — в каталоге `logs/` (`app-*`, `error-*`, `security-*`).

Режим разработки с перезапуском: `npm run dev`. Остановить БД с сохранением
данных: `docker compose down` (том `pgdata` сохраняется).

Учётные записи seed задаются переменными `SEED_*_EMAIL` / `SEED_*_PASSWORD`;
пароли проходят ту же проверку сложности, что и при регистрации. Значения с `#`
в `.env` нужно брать в кавычки, иначе dotenv воспримет остаток строки как комментарий.

### Проверка через Postman / Newman

Импортировать `postman/gtd-secure-api.postman_collection.json` и запустить папки по
порядку в Collection Runner. Скрипты тестов сами сохраняют токены и id в переменные
коллекции. Из консоли:

```bash
npx newman run postman/gtd-secure-api.postman_collection.json --env-var baseUrl=http://localhost:3000
```

Коллекция: 102 запроса в 8 папках (служебное и Swagger, аутентификация, контексты
и публичный каталог, задачи, пользователи и роли, блокировка, выход, rate limiting),
184 проверки, включая 401/403/404/409/413/415/423/429 и экранирование вывода.
Последний прогон Newman на чистом seed: 0 ошибок.

Папка «07. Rate limiting» исчерпывает лимит попыток входа с текущего IP на
`RATE_LIMIT_WINDOW_MINUTES` минут — её запускают последней или перезапускают сервер.

## Ролевая модель

`roleGuard(requiredRole)` пропускает пользователя, если его роль не ниже требуемой:
`user (1) < moderator (2) < admin (3)`. Роль берётся из БД при каждом запросе,
а не из токена, поэтому понижение роли действует сразу.

| Действие | user | moderator | admin |
|---|---|---|---|
| Публичный каталог контекстов `GET /contexts/public` | без входа | без входа | без входа |
| CRUD своих задач и контекстов, публикация своего контекста | да | да | да |
| Чтение чужих задач и контекстов | нет (403 + запись в журнал) | да | да |
| Изменение чужих задач и контекстов | нет | нет | нет |
| Удаление чужих задач и контекстов | нет | нет | да |
| `GET /users`, `GET /users/:id` | нет | да | да |
| `PATCH /users/:id/role`, `DELETE /users/:id` | нет | нет | да |

Схема повторяет пример из задания: чтение каталога публичное, создание — только
после входа, удаление чужих данных — только администратор. Задачи остаются
личными: публичный доступ есть лишь к контекстам, которые владелец сам отметил
`isPublic: true`, и в каталоге не раскрывается владелец.

Изменять чужие задачи не может никто: задача — личные данные владельца, а
администратору для модерации достаточно удаления.

## Обязательные меры защиты

| Мера | Реализация |
|---|---|
| SQL-инъекции | Только методы Sequelize с параметризованными запросами, сырого SQL нет |
| Хеширование паролей | bcrypt, 12 раундов; при неизвестном email всё равно выполняется сравнение с фиктивным хешем, чтобы время ответа не выдавало существование учётной записи |
| JWT | HS256 с явным списком алгоритмов, `iss`/`aud`, тип токена в payload, разные секреты для access и refresh; секреты короче 32 символов не принимаются при старте |
| helmet | Строгая CSP `default-src 'none'` (API не отдаёт HTML), `X-Frame-Options: DENY`, HSTS, `nosniff` |
| Rate limiting | Глобально 300 запросов / 15 мин на IP; для `/auth/login`, `/auth/register`, `/auth/refresh` — 20 неуспешных запросов / 15 мин |
| Валидация | Joi-схема на каждый источник (`params`, `query`, `body`) каждого маршрута; источник без схемы обязан быть пустым |
| XSS | Вход: удаление HTML-тегов из всех строк тела запроса (кроме пароля). Выход: `json escape` — символы `<`, `>`, `&` в JSON-ответах кодируются как `\u003c`, `\u003e`, `\u0026`; ответы только `application/json` с `nosniff` и CSP `default-src 'none'` |
| Журнал подозрительных действий | `logs/security-*.log` и консоль, JSON-строка на событие с IP, методом, путём, user-agent и id пользователя (см. таблицу ниже) |

### События журнала безопасности

| Событие | Когда пишется |
|---|---|
| `login_failed` | Неверный пароль или неизвестный email |
| `account_locked`, `login_blocked_locked` | 5-я неудачная попытка; попытка входа в заблокированную учётную запись |
| `foreign_resource_access` | Обращение к чужой задаче или контексту, запрос списка с чужим `ownerId` |
| `insufficient_role` | `roleGuard` отказал: роль ниже требуемой |
| `rate_limit_exceeded` | Массовые запросы: превышен глобальный лимит или лимит `/auth/*` |
| `invalid_token`, `refresh_token_reuse` | Поддельный/повреждённый JWT; повторное предъявление отозванного refresh-токена |
| `mass_assignment_attempt`, `cors_origin_rejected` | Лишние поля в теле (`role`, `ownerId`…); запрос с неразрешённого `Origin` |

Пример записи:

```json
{"event":"foreign_resource_access","userId":4,"role":"user","ip":"::1","method":"GET","path":"/tasks/5","resourceType":"Task","resourceId":5,"ownerId":3,"action":"read","level":"warn","timestamp":"2026-10-06T08:16:29.329Z"}
```

## Дополнительные меры и обоснование

| № | Мера | Зачем и как |
|---|---|---|
| 3 | Сложность пароля | Минимум 8 символов, буква, цифра и спецсимвол; максимум 72 — предел bcrypt, дальше символы молча отбрасываются |
| 5 | Короткий access + refresh с ротацией | Access-токен живёт 15 минут, поэтому украденный токен быстро теряет силу. Refresh-токен лежит в cookie `httpOnly; SameSite=Strict; Path=/auth` (в production ещё `Secure`), JavaScript страницы его не видит. В БД хранится только SHA-256 хеш. Каждый `/auth/refresh` отзывает старый токен и выдаёт новый; повторное предъявление уже отозванного токена считается кражей — отзываются все сессии пользователя и событие пишется в журнал |
| 6 | Блокировка после 5 неудачных входов | `failedAttempts` и `lockUntil` в таблице `users`: после 5 ошибок вход закрыт на 15 минут, ответ `423 Locked` с `Retry-After`. Во время блокировки пароль не проверяется вовсе — перебор бесполезен |
| 9 | Защита от mass assignment | Joi отклоняет неизвестные поля (`role`, `ownerId`, `passwordHash`…) с кодом 400 и записью в журнал; сервисы дополнительно копируют только поля из белого списка и передают `fields` в Sequelize |
| 12 | Ограничение размера тела | `express.json({ limit: '10kb' })`, превышение — 413 |
| 15 | Только `application/json` | POST/PATCH с телом и другим Content-Type получают 415 до разбора тела |
| 19 | Санитизация | `sanitize-html` без разрешённых тегов: `<script>…</script>` удаляется вместе с содержимым, прочие теги вырезаются |
| 22 | CORS по белому списку | Источники из `CORS_ORIGINS`; чужой `Origin` получает 403 и попадает в журнал. Запросы без `Origin` (curl, Postman, сервер-сервер) разрешены — CORS защищает только браузер |
| 24 | Ошибки без деталей в production | При `NODE_ENV=production` на 500 отвечаем только «Внутренняя ошибка сервера»; в development добавляется блок `debug` с именем, сообщением и стеком |
| 30 | Журнал ошибок с ротацией | `logs/error-YYYY-MM-DD.log`, ротация по дням и по 10 МБ, архивы gzip, хранение 14 дней; так же ротируются `app-*.log` и `security-*.log` |

Также: `query parser: simple` (нет вложенных объектов в query), `trust proxy`
задаётся через `TRUST_PROXY`, чтобы лимиты и журнал видели настоящий IP за прокси,
порт PostgreSQL в docker-compose слушает только `127.0.0.1`.

## Переменные окружения

См. `.env.example`. Основные: `PORT` (по умолчанию 3000), `JWT_SECRET`,
`JWT_REFRESH_SECRET` (≥ 32 символов, различные), `DATABASE_URL`
(`postgres://user:password@host:port/db`). Остальные имеют значения по умолчанию.
Файл `.env` в репозиторий не попадает (`.gitignore`).

## Ограничения

Схема БД создаётся `sequelize.sync()` при старте, миграций нет; добавленные
позже столбцы (`contexts.isPublic`) дописываются в существующие таблицы при старте. Счётчики
rate limiting хранятся в памяти процесса и сбрасываются при перезапуске; для
нескольких экземпляров нужен общий store (например, Redis).

Описание эндпоинтов — в [API.md](API.md) и в Swagger UI (`/api-docs`).
