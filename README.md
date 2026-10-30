# GTD Task Service — безопасный REST API

Backend сервиса планирования задач по методу GTD (Getting Things Done) с контекстами
(`@home`, `@work`, `@calls`) и напоминаниями. Индивидуальная практическая работа
«Разработка безопасного REST API»: аутентификация по JWT, ролевая модель
`user` / `moderator` / `admin` и защита от типовых угроз OWASP API Top 10.
Ветка `kr21` — контрольная работа №1 «Серверная разработка» (ИТиВП, часть 2).
Ветка `ipr22` — индивидуальная практическая работа №2 «Деплой и мониторинг приложения»:
CI/CD (GitHub Actions), Docker, деплой на Render, мониторинг, журналы, Sentry и метрики —
см. раздел [«Мониторинг и деплой»](#мониторинг-и-деплой).

## Контрольная работа №1: соответствие заданию

Основная сущность — **задача** (`Task`: `title`, `notes`, `status`, `dueDate`, `remindAt`,
`contextId`, `ownerId` + `id`, `createdAt`, `updatedAt`); поле `status` ограничено
перечислением GTD, `title` и даты проходят валидацию, `email` пользователя уникален.

| Требование КР №1 | Реализация |
|---|---|
| `POST /auth/register`, `POST /auth/login` | регистрация с bcrypt, выдача JWT (access + refresh) |
| `GET /tasks`, `GET /tasks/:id` | список с фильтрами `status`, `contextId`, `dueBefore`; детали |
| `POST /tasks` | любая аутентифицированная роль (`user` и выше) |
| `PUT /tasks/:id` | владелец или `admin` (`PATCH` — частичное обновление) |
| `DELETE /tasks/:id` | только `admin`, остальным 403 `ADMIN_ONLY` |
| Дополнительные эндпоинты | фильтрация списка, `GET /tasks/reminders/due`, контексты, пользователи |
| Валидация | Joi на `params`, `query`, `body` каждого маршрута |
| Документация | `API.md`, OpenAPI + Swagger UI на `/api-docs` |
| Тесты | коллекция Postman `postman/gtd-secure-api.postman_collection.json` |

## Стек

| Слой | Технология |
|---|---|
| HTTP | Node.js ≥ 20, Express 5 |
| БД | PostgreSQL 16 (Docker), Sequelize 6 |
| Аутентификация | jsonwebtoken (HS256), bcrypt (12 раундов) |
| Валидация | Joi — для `params`, `query` и `body` каждого маршрута |
| Защита | helmet, cors, express-rate-limit, sanitize-html |
| Журналирование | winston + winston-daily-rotate-file; внешний сервис — `@logtail/winston` (Better Stack), включается токеном |
| Ошибки | `@sentry/node` (включается `SENTRY_DSN`) |
| Тесты и качество | Jest + supertest, ESLint 10 |
| Контейнер и CI/CD | Docker (`node:24-alpine`), GitHub Actions, Render (бэкенд), Vercel (фронтенд), Neon (БД) |
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
                 rateLimiters, cors, requestLogger, errorHandler,
                 metricsCollector (счётчик запросов), metricsAccess (доступ к /metrics)
  monitoring/    metrics.js — снимок метрик, health.js — проверка БД
  public/dashboard/  HTML/CSS/JS страницы /dashboard (без inline-скриптов)
  validators/    Joi-схемы и русские сообщения об ошибках
  utils/         иерархия AppError, логгеры, токены, пароли, роли, санитизация
  app.js         фабрика Express-приложения
  server.js      запуск: подключение к БД, sync, listen, graceful shutdown
scripts/seed.js  создание admin/moderator/user из переменных окружения
docs/openapi.json  спецификация OpenAPI 3.0 для Swagger UI
postman/         коллекция Postman v2.1 со всеми сценариями
docker-compose.yml  PostgreSQL для разработки
tests/           Jest + supertest (health, auth, metrics, sentry-test, unit)
Dockerfile, .dockerignore   образ приложения
render.yaml, vercel.json    конфигурация платформ деплоя
.github/workflows/deploy.yml   CI/CD: lint → тесты → Docker → деплой → Telegram
eslint.config.js            правила ESLint
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

- `GET http://localhost:3000/health` — проверка доступности (`/health/ready` проверяет ещё и БД);
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

Коллекция: 129 запросов в 8 папках (служебное и Swagger, аутентификация, контексты
и публичный каталог, задачи, пользователи и роли, блокировка, выход, rate limiting),
196 проверок, включая 401/403/404/409/413/415/423/429 и экранирование вывода.
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
| Изменение чужих контекстов | нет | нет | нет |
| Изменение задач (`PUT`, `PATCH /tasks/:id`) | только свои | только свои | любых |
| Удаление задач (`DELETE /tasks/:id`) | нет (403 `ADMIN_ONLY`) | нет | да |
| Удаление чужих контекстов | нет | нет | да |
| `GET /users`, `GET /users/:id` | нет | да | да |
| `PATCH /users/:id/role`, `DELETE /users/:id` | нет | нет | да |

Схема повторяет пример из задания: чтение каталога публичное, создание — только
после входа, удаление чужих данных — только администратор. Задачи остаются
личными: публичный доступ есть лишь к контекстам, которые владелец сам отметил
`isPublic: true`, и в каталоге не раскрывается владелец.

Задача — личные данные владельца: изменять её может только владелец или администратор,
а удалять — только администратор (требование контрольной работы №1).

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

Полный список с примерами — `.env.example`; файл `.env` в репозиторий не попадает.

| Переменная | Обязательна | Назначение |
|---|---|---|
| `DATABASE_URL` | да | `postgres://user:password@host:port/db` (локально — Docker, в проде — Neon) |
| `DATABASE_SSL` | нет | `true` для Neon/Supabase (TLS с проверкой сертификата); локально `false` |
| `JWT_SECRET`, `JWT_REFRESH_SECRET` | да | ≥ 32 символов, различные (`openssl rand -hex 32`) |
| `PORT` | нет | порт HTTP (на Render задаётся платформой) |
| `NODE_ENV` | нет | `production` скрывает детали 500 и включает `Secure` для cookie |
| `TRUST_PROXY` | нет | число прокси перед приложением; на Render `1`, чтобы лимиты и журнал видели реальный IP |
| `CORS_ORIGINS` | нет | белый список источников через запятую (адрес фронтенда) |
| `METRICS_TOKEN` | нет | статический токен для `/metrics` и `/dashboard` (≥ 32 символов); без него метрики открыты только администратору |
| `SENTRY_DSN`, `SENTRY_ENVIRONMENT` | нет | без DSN Sentry полностью выключен |
| `LOGTAIL_SOURCE_TOKEN`, `LOGTAIL_ENDPOINT` | нет | без токена журналы остаются локальными; `LOGTAIL_ENDPOINT` — хост приёма из настроек источника Better Stack |
| `RELEASE` | нет | версия релиза в Sentry и журналах (на Render подставляется `RENDER_GIT_COMMIT`) |
| `LOG_DIR`, `LOG_LEVEL` | нет | каталог и уровень журнала |

Остальные переменные (`JWT_*_TTL`, `BCRYPT_ROUNDS`, лимиты, `SEED_*`) имеют значения по умолчанию.

## Тесты и линтер

```bash
npm run lint        # ESLint
npm test            # Jest + supertest, нужна PostgreSQL по DATABASE_URL (см. .env)
npm run test:ci     # то же с отчётом о покрытии (как в CI)
```

Тесты используют реальное приложение (`createApp()`) и реальную БД: `/health`,
`/health/ready`, 401 без токена и с поддельным JWT, валидацию (400, mass assignment,
битый JSON, 415), доступ к `/metrics` (401/403/200), счётчик запросов, CSP страницы
`/dashboard`, `POST /debug/sentry-test` (401/403/500 + вызов отправки в Sentry).
Тестовые пользователи создаются с суффиксом `@jest.gtd.test` и удаляются после прогона.
Jest запускается с `--experimental-vm-modules`: `sanitize-html` зависит от ESM-пакета.

## Мониторинг и деплой

Индивидуальная практическая работа №2. **Ссылки ниже — заглушки: аккаунты и сервисы
создаёт владелец репозитория, после этого значения вносятся сюда.**

| Что | Ссылка |
|---|---|
| Приложение (бэкенд, Render) | `<TODO: продакшен-URL>` |
| Проверка живости | `<TODO: продакшен-URL>/health` |
| Swagger UI | `<TODO: продакшен-URL>/api-docs` |
| Фронтенд (Vercel) | `<TODO: URL фронтенда>` |
| Дашборд метрик приложения | `<TODO: продакшен-URL>/dashboard` (нужен `METRICS_TOKEN`) |
| Дашборд UptimeRobot (публичная страница статуса) | `<TODO: дашборд UptimeRobot>` |
| Ошибки (Sentry) | `<TODO: Sentry>` |
| Журналы (Better Stack / Logtail) | `<TODO: Logtail>` |
| GitHub Actions | `<TODO: https://github.com/Alexandr-Obraztsov/gtd-task-service/actions>` |
| Контакты | А. С. Образцов, гр. 320601, `<TODO: e-mail / Telegram для связи>` |

### Схема

```
git push main ─► GitHub Actions ─► lint ─► тесты (Postgres service) ─► Docker build
                                                         │
                          ┌──────────────────────────────┤
                          ▼                              ▼
              Render Deploy Hook ─► Render (Docker)     Vercel CLI ─► Vercel (client/)
                          │                 │
                          │       Neon (PostgreSQL, TLS)
                          ▼                 ▼
              проверка /health        Sentry · Better Stack · UptimeRobot
                          │
                          ▼
                 уведомление в Telegram (успех / провал)
```

### Выбор инструментов

| Задача | Инструмент | Почему |
|---|---|---|
| CI/CD | GitHub Actions | репозиторий уже на GitHub, 2000 бесплатных минут в месяц, секреты и окружения встроены |
| Бэкенд | Render (Docker, free) | принимает `Dockerfile`, Deploy Hook для запуска из CI, `render.yaml`; доступен из Беларуси |
| Фронтенд | Vercel | деплой статической сборки одной командой CLI |
| БД | Neon (PostgreSQL) | бесплатная управляемая БД, TLS, не истекает как бесплатная БД Render |
| Uptime | UptimeRobot | 50 мониторов с интервалом 5 минут, публичная страница статуса, уведомления в Telegram |
| Журналы | Better Stack (Logtail) через `@logtail/winston` | подключается как ещё один транспорт winston, поиск и фильтры по JSON-полям |
| Ошибки | Sentry (`@sentry/node`) | стек, окружение, релиз, группировка, оповещения |
| Уведомления | Telegram Bot API | один `curl`, без сторонних действий в workflow |

### Workflow `.github/workflows/deploy.yml`

Запускается при `push` в `main`, при `pull_request` в `main` и вручную (`workflow_dispatch`).
Для pull request выполняются только проверки.

| Задача | Что делает |
|---|---|
| `test` | PostgreSQL 16 как service container, `npm ci`, `npm run lint`, `npm run test:ci` |
| `docker` | `docker buildx build` с кэшем слоёв GitHub Actions (`type=gha`), образ не публикуется, проверяется запуск `node` в контейнере |
| `deploy-backend` | `curl -X POST $RENDER_DEPLOY_HOOK_URL`, затем опрос `/health` до 10 минут (если задана переменная `PRODUCTION_URL`) |
| `deploy-frontend` | выполняется, **только если есть `client/package.json`** и заданы секреты Vercel: `vercel pull`, `vercel build --prod`, `vercel deploy --prebuilt --prod` |
| `notify` | всегда: статус сборки в Telegram; пропускается, если секреты бота не заданы |

Шаги деплоя и уведомления сами пропускаются при отсутствии секретов, поэтому workflow
не падает в форке без настроенных сервисов. Деплой запускается только после успеха
`test` и `docker`. Автодеплой Render выключен (`autoDeploy: false` в `render.yaml`),
чтобы непроверенный коммит не попал в продакшен в обход CI.

Workflow срабатывает на ветку `main`. Чтобы прогнать его на ветке `ipr22`, добавьте
её в `on.push.branches` либо влейте ветку в `main`.

### GitHub Secrets и Variables

Settings → Secrets and variables → Actions. Значения здесь не хранятся и придумываться
не должны: их выдают сами сервисы.

| Имя | Тип | Где взять | Используется в |
|---|---|---|---|
| `RENDER_DEPLOY_HOOK_URL` | Secret | Render → сервис → Settings → Deploy Hook | `deploy-backend` |
| `VERCEL_TOKEN` | Secret | Vercel → Account Settings → Tokens | `deploy-frontend` |
| `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID` | Secret | `.vercel/project.json` после `vercel link` | `deploy-frontend` |
| `TELEGRAM_BOT_TOKEN` | Secret | @BotFather → `/newbot` | `notify` |
| `TELEGRAM_CHAT_ID` | Secret | `getUpdates` бота после сообщения ему, либо id группы | `notify` |
| `PRODUCTION_URL` | Variable | URL сервиса на Render, без `/` в конце | проверка `/health`, `VITE_API_URL` фронтенда |

Секреты приложения (`DATABASE_URL`, `JWT_*`, `METRICS_TOKEN`, `SENTRY_DSN`,
`LOGTAIL_SOURCE_TOKEN`) в GitHub **не нужны**: они вводятся в панели Render
(`sync: false` в `render.yaml`) и в репозиторий не попадают.

### Первичная настройка (делает владелец)

1. **Neon**: создать проект и БД, скопировать строку подключения в `DATABASE_URL` на Render, `DATABASE_SSL=true`.
2. **Render**: New → Blueprint → выбрать репозиторий (`render.yaml`), ввести значения переменных с `sync: false`
   (`JWT_SECRET`, `JWT_REFRESH_SECRET`, `METRICS_TOKEN` — `openssl rand -hex 32`), `CORS_ORIGINS` — адрес фронтенда.
   Скопировать Deploy Hook в секрет GitHub. Один раз выполнить сидирование: Shell на Render или локально
   `DATABASE_URL=<neon> DATABASE_SSL=true npm run seed`.
3. **Vercel**: `vercel link` в корне репозитория, поле Root Directory оставить пустым (сборку направляет `vercel.json`),
   переменные `VERCEL_*` занести в секреты GitHub.
4. **Telegram**: создать бота в @BotFather, написать ему сообщение, получить `chat_id`, занести оба значения в секреты.
5. **UptimeRobot**: New monitor → HTTP(s), URL `<продакшен-URL>/health`, интервал 5 минут, ключевое слово `"status":"ok"`;
   Alert contacts → Telegram; Status pages → создать публичную страницу и вписать ссылку в таблицу выше.
   Второй монитор на `/health/ready` ставить с большим интервалом: он обращается к БД и не даёт Neon «заснуть».
6. **Better Stack (Logtail)**: Sources → Connect source → Node.js, скопировать Source token и хост приёма в
   `LOGTAIL_SOURCE_TOKEN` / `LOGTAIL_ENDPOINT` на Render.
7. **Sentry**: создать проект Node.js, DSN — в `SENTRY_DSN` на Render. Проверка: войти администратором и выполнить
   `POST /debug/sentry-test` (кнопка «Try it out» в Swagger UI), событие появится в Issues.

### Эндпоинты мониторинга

| Эндпоинт | Доступ | Назначение |
|---|---|---|
| `GET /health` | открыт | liveness: процесс жив, всегда `{"status":"ok"}`, без обращения к БД |
| `GET /health/ready` | открыт | readiness: `SELECT 1` с таймаутом 3 с, `200` либо `503`; причина ошибки драйвера наружу не отдаётся |
| `GET /metrics` | `Bearer METRICS_TOKEN` **или** access-токен `admin` | JSON: uptime, `process.memoryUsage()` в МБ, load average, счётчик запросов по классам статуса, среднее время ответа |
| `GET /dashboard` | страница открыта, данные — по токену | HTML-дашборд с автообновлением (5/10/30 с) |
| `POST /debug/sentry-test` | только `admin` | выбрасывает тестовую ошибку: ответ 500, запись в журнал и событие в Sentry |

**Почему метрики закрыты.** Они раскрывают версию Node, объём памяти, нагрузку и профиль трафика —
это материал для разведки. Поэтому `/metrics` требует либо статический `METRICS_TOKEN` (его
нужно выдать сборщику метрик или дашборду), либо JWT администратора (разовый просмотр без отдельного секрета).
Токен сравнивается через `crypto.timingSafeEqual` по SHA-256, неверные попытки пишутся в журнал
безопасности (`invalid_token`) и ограничиваются лимитом `AUTH_RATE_LIMIT_MAX`. Если `METRICS_TOKEN`
не задан, остаётся только вход администратором. `/health` открыт намеренно: ему нужен внешний монитор, а ответ
не содержит данных.

**Дашборд и CSP.** API отдаёт CSP `default-src 'none'`, а валидатор требует пустые `params/query/body`
у маршрутов без схемы. Поэтому страница `/dashboard` — единственный HTML-ответ — получает отдельную политику
(`script-src 'self'`, `connect-src 'self'`, без `unsafe-inline`), скрипт и стили вынесены в файлы
`src/public/dashboard/`, маршруты проходят через `validate()`, данные подставляются через `textContent`.
Токен вводится в форму на странице и хранится в `sessionStorage` вкладки, не в URL. Обращения к `/metrics` и
`/dashboard` в счётчик запросов не входят. Автообновление считается в общий лимит 300 запросов / 15 мин
на IP, поэтому период по умолчанию 10 с (90 запросов).

**Тестовая ошибка безопасна:** маршрут существует и в production (иначе нельзя проверить интеграцию), но доступен
только роли `admin`, только методом `POST`, не принимает входных данных и отвечает клиенту стандартным
`500 Внутренняя ошибка сервера` без стека.

### Журналы

`winston` пишет в консоль (её собирает Render Logs), в файлы `logs/` с ротацией и — если задан
`LOGTAIL_SOURCE_TOKEN` — в Better Stack. Записи JSON, к каждой добавлены `service` и `release`.

| Событие | Уровень |
|---|---|
| `server_started` (порт, окружение, включённые Sentry / удалённые журналы / метрики), `database_connected`, `shutdown_started` | info |
| `http` — каждый запрос: метод, путь, статус, время, IP | info, для статусов ≥ 400 — warn |
| `request_rejected` — отклонённый запрос: статус, код, поля с ошибкой валидации (значения не пишутся) | warn |
| журнал безопасности: `login_failed`, `invalid_token`, `rate_limit_exceeded`… | warn |
| необработанные ошибки с стеком, `uncaught_exception`, `unhandled_rejection`, `server_start_failed` | error |

При `uncaughtException` процесс записывает ошибку, отправляет накопленные данные в Sentry и
Better Stack и завершается с кодом 1 — платформа перезапускает контейнер.

### Sentry на фронтенде (клиент в `client/`, в этой ветке не реализован)

В React-клиенте: `npm i @sentry/react`, в `main.jsx` до рендера вызвать
`Sentry.init({ dsn: import.meta.env.VITE_SENTRY_DSN, environment: import.meta.env.MODE, sendDefaultPii: false })`,
обернуть корневой компонент в `Sentry.ErrorBoundary` с запасным экраном. `VITE_SENTRY_DSN` задаётся в переменных
проекта Vercel (отдельный проект Sentry типа React). Для читаемых стеков загружать source maps плагином
`@sentry/vite-plugin` с токеном из секретов CI. Приёмник DSN должен быть разрешён в CSP клиента (`connect-src`).

### Откат и ограничения бесплатных планов

- **Откат.** Render хранит историю деплоев: Events → Rollback к предыдущему образу за секунды; Vercel — Promote to
  Production для прошлого деплоя. Схема БД создаётся `sync()` без миграций, поэтому откат кода безопасен, пока
  изменения схемы только добавляют столбцы.
- **Render free**: сервис засыпает через 15 минут без трафика, «холодный» старт до минуты; 750 часов в месяц.
  Пинг UptimeRobot раз в 5 минут держит сервис активным, но расходует часы.
- **Neon free**: вычисления отключаются при простое; ограничены объём хранилища и часы вычислений.
- **Better Stack, Sentry, UptimeRobot** — лимиты на объём журналов, события в месяц и число мониторов; при превышении
  данные отбрасываются, приложение продолжает работать.
- Файловая система контейнера на Render временная: `logs/` пропадают при перезапуске — поэтому нужен удалённый сборщик журналов.

## Ограничения

Схема БД создаётся `sequelize.sync()` при старте, миграций нет; добавленные
позже столбцы (`contexts.isPublic`) дописываются в существующие таблицы при старте. Счётчики
rate limiting хранятся в памяти процесса и сбрасываются при перезапуске; для
нескольких экземпляров нужен общий store (например, Redis).

Описание эндпоинтов — в [API.md](API.md) и в Swagger UI (`/api-docs`).
