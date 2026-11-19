# GTD Task Service — безопасный REST API

Backend сервиса планирования задач по методу GTD (Getting Things Done) с контекстами
(`@home`, `@work`, `@calls`) и напоминаниями. Индивидуальная практическая работа
«Разработка безопасного REST API»: аутентификация по JWT, ролевая модель
`user` / `moderator` / `admin` и защита от типовых угроз OWASP API Top 10.
Ветка `kr21` — контрольная работа №1 «Серверная разработка» (ИТиВП, часть 2).
Ветка `ipr22` — индивидуальная практическая работа №2 «Деплой и мониторинг приложения»:
CI/CD (GitHub Actions), деплой на VPS в Docker Compose (https://gtd.cloudyyy.tech), Uptime Kuma,
журналы в Grafana Loki, сбор ошибок в GlitchTip, метрики и уведомления в Telegram —
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
| Журналирование | winston + winston-daily-rotate-file; `winston-loki` (Grafana Loki), включается `LOKI_URL`; `@logtail/winston` — запасной вариант |
| Ошибки | `@sentry/node` и `@sentry/react` → GlitchTip (включаются `SENTRY_DSN` / `VITE_SENTRY_DSN`) |
| Тесты и качество | Jest + supertest, ESLint 10 |
| Контейнер и CI/CD | Docker (`node:24-alpine`), Docker Compose, GitHub Actions, деплой на VPS по SSH |
| Наблюдаемость | Uptime Kuma, Grafana + Loki, GlitchTip, Telegram Bot API |
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
client/          React-клиент (из КР №2): Dockerfile и nginx.conf для продакшена, monitoring.js — GlitchTip
Dockerfile, .dockerignore   образ API
docker-compose.prod.yml     продакшен: api, web, postgres, uptime-kuma, glitchtip, loki, grafana
deploy/          deploy.sh (деплой по SSH), setup-host.sh (nginx + сертификат), nginx/, loki/,
                 grafana/ (источник данных и дашборд), uptime-kuma-setup.js, .env.prod.example
.github/workflows/deploy.yml   CI/CD: lint и тесты → сборка клиента → образы → деплой → Telegram
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
| `DATABASE_URL` | да | `postgres://user:password@host:port/db` (локально и в проде — PostgreSQL в Docker) |
| `DATABASE_SSL` | нет | `true` для облачной БД с TLS (Neon/Supabase); локально и на VPS `false` |
| `JWT_SECRET`, `JWT_REFRESH_SECRET` | да | ≥ 32 символов, различные (`openssl rand -hex 32`) |
| `PORT` | нет | порт HTTP |
| `NODE_ENV` | нет | `production` скрывает детали 500 и включает `Secure` для cookie |
| `TRUST_PROXY` | нет | число прокси перед приложением; за nginx хоста `1`, чтобы лимиты и журнал видели реальный IP |
| `CORS_ORIGINS` | нет | белый список источников через запятую (адрес фронтенда) |
| `METRICS_TOKEN` | нет | статический токен для `/metrics` и `/dashboard` (≥ 32 символов); без него метрики открыты только администратору |
| `SENTRY_DSN`, `SENTRY_ENVIRONMENT` | нет | без DSN Sentry полностью выключен |
| `LOKI_URL` | нет | адрес Grafana Loki (`http://loki:3100` в `docker-compose.prod.yml`); без него журналы остаются локальными |
| `LOGTAIL_SOURCE_TOKEN`, `LOGTAIL_ENDPOINT` | нет | без токена журналы остаются локальными; `LOGTAIL_ENDPOINT` — хост приёма из настроек источника Better Stack |
| `RELEASE` | нет | версия релиза в GlitchTip и журналах (при деплое — короткий хеш коммита) |
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

Индивидуальная практическая работа №2. Приложение и все средства наблюдения работают на
собственном VPS в Docker Compose, перед ними стоит nginx хоста с HTTPS (Let's Encrypt).

| Что | Ссылка |
|---|---|
| Фронтенд (React) | https://gtd.cloudyyy.tech |
| Бэкенд (REST API) | https://api.gtd.cloudyyy.tech |
| Проверка живости и готовности | https://api.gtd.cloudyyy.tech/health, `/health/ready` |
| Swagger UI | https://api.gtd.cloudyyy.tech/api-docs |
| Дашборд метрик приложения | https://api.gtd.cloudyyy.tech/dashboard (нужен `METRICS_TOKEN` или вход администратора) |
| Мониторинг доступности (Uptime Kuma), статус-страница | https://uptime.gtd.cloudyyy.tech/status/gtd |
| Ошибки (GlitchTip, совместим с Sentry) | https://errors.gtd.cloudyyy.tech |
| Журналы (Grafana + Loki) | https://logs.gtd.cloudyyy.tech |
| CI/CD (GitHub Actions) | вкладка Actions репозитория, workflow «CI/CD» |
| Уведомления | Telegram-бот: итог каждой сборки и сообщения Down/Up от Uptime Kuma |
| Контакты | А. С. Образцов, гр. 320601 |

### Схема

```
git push ─► GitHub Actions: ESLint + Jest (PostgreSQL) │ сборка клиента Vite
                               └──────────┬─────────────┘
                                          ▼
                         сборка образов api и web (docker compose)
                                          ▼
                 SSH (ключ ограничен deploy/deploy.sh) ─► VPS: git checkout,
                 docker compose up -d --build, ожидание /health/ready
                                          ▼
                     проверка по HTTPS ─► уведомление в Telegram

VPS (Docker Compose, порты только на 127.0.0.1)
  nginx хоста, HTTPS ─┬─ gtd.…        ─► web  (nginx со сборкой React)
                      ├─ api.gtd.…    ─► api  (Node.js + Express) ─► postgres
                      ├─ uptime.gtd.… ─► uptime-kuma ─► Telegram
                      ├─ errors.gtd.… ─► glitchtip   ◄─ Sentry SDK (API и браузер)
                      └─ logs.gtd.…   ─► grafana ◄─ loki ◄─ winston-loki (API)
```

### Выбор инструментов

| Задача | Инструмент | Почему |
|---|---|---|
| CI/CD | GitHub Actions | репозиторий на GitHub, секреты и окружения встроены, бесплатно для публичного репозитория |
| Хостинг API и клиента | VPS, Docker Compose, nginx, Let's Encrypt | нет засыпания и лимитов бесплатных тарифов, доступно из Беларуси, всё окружение описано одним файлом |
| БД | PostgreSQL 16 в контейнере | та же СУБД, что в разработке и CI; данные в томе Docker, наружу порт не открыт |
| Uptime | Uptime Kuma | проверка раз в минуту с поиском ключевого слова, статус-страница, уведомления в Telegram |
| Журналы | Grafana Loki + Grafana | транспорт `winston-loki`, запросы LogQL, готовый дашборд |
| Ошибки | GlitchTip | открытый сервер с протоколом Sentry: работают `@sentry/node` и `@sentry/react` без изменений кода |
| Уведомления | Telegram Bot API | `curl` из workflow и встроенный канал Uptime Kuma |

Вариант с Render + Vercel + Neon + UptimeRobot + Better Stack + Sentry отклонён: сервис на
Render засыпает, бесплатная БД и журналы ограничены по объёму и сроку, часть сервисов
неудобна для регистрации из Беларуси. Транспорт Logtail в коде сохранён и включается
переменной `LOGTAIL_SOURCE_TOKEN`.

### Workflow `.github/workflows/deploy.yml`

Запускается при `push` в `main`, `ipr22`, `ipr22-vps`, при любом pull request и вручную.

| Задача | Что делает |
|---|---|
| `test` | PostgreSQL 16 как service container, `npm ci`, `npm run lint`, `npm run test:ci` |
| `client` | `npm ci` и `npm run build` клиента с адресом продакшен-API |
| `images` | `docker compose -f docker-compose.prod.yml build api web`, проверка запуска образа API |
| `deploy` | только push в разрешённые ветки: SSH на сервер командой `deploy <ветка>`, затем `curl` к `/health/ready` и главной странице по HTTPS |
| `notify` | всегда для push: статус каждой задачи и ссылка на прогон в Telegram |

Деплой и уведомление пропускаются, если секреты не заданы, поэтому workflow не падает в
репозитории без настроенного сервера.

### GitHub Secrets и Variables

| Имя | Тип | Назначение |
|---|---|---|
| `VPS_SSH_KEY` | Secret | приватный ключ деплоя (ed25519), на сервере ограничен `command="…/deploy/deploy.sh",restrict` |
| `TELEGRAM_BOT_TOKEN` | Secret | токен бота от @BotFather |
| `VPS_HOST`, `VPS_PORT`, `VPS_USER` | Variable | адрес SSH сервера |
| `VPS_KNOWN_HOSTS` | Variable | отпечатки ключей сервера (`ssh-keyscan`), проверка `StrictHostKeyChecking=yes` |
| `TELEGRAM_CHAT_ID` | Variable | чат для уведомлений |

Секреты приложения (`JWT_*`, пароль БД, `METRICS_TOKEN`, ключ GlitchTip, пароли
администраторов) в GitHub не передаются: они лежат только в `.env` на сервере с правами `600`.

### Развёртывание с нуля

```bash
git clone -b ipr22-vps https://github.com/<owner>/gtd-task-service ~/apps/gtd && cd ~/apps/gtd
cp deploy/.env.prod.example .env && chmod 600 .env        # заполнить, секреты: openssl rand -hex 32
docker compose -f docker-compose.prod.yml up -d --build
docker compose -f docker-compose.prod.yml exec -T -e LOKI_URL= api node scripts/seed.js   # учётные записи
sudo bash deploy/setup-host.sh                             # nginx + сертификат на 5 имён
# Uptime Kuma: администратор, Telegram, мониторы, статус-страница
KUMA_USER=admin KUMA_PASS=... TELEGRAM_BOT_TOKEN=... TELEGRAM_CHAT_ID=... \
  docker compose -f docker-compose.prod.yml exec -T -e KUMA_USER -e KUMA_PASS -e TELEGRAM_BOT_TOKEN -e TELEGRAM_CHAT_ID \
  uptime-kuma node - < deploy/uptime-kuma-setup.js
```

В GlitchTip создаются организация и два проекта (`gtd-backend`, `gtd-frontend`); их DSN
вписываются в `SENTRY_DSN` и `VITE_SENTRY_DSN` в `.env`. API отправляет ошибки в GlitchTip
по внутренней сети Docker (`http://…@glitchtip:8000/1`), браузер — по HTTPS.

### Эндпоинты мониторинга

| Эндпоинт | Доступ | Назначение |
|---|---|---|
| `GET /health` | открыт | liveness: процесс жив, `{"status":"ok"}`, без обращения к БД |
| `GET /health/ready` | открыт | readiness: `SELECT 1` с таймаутом 3 с, `200` либо `503`; его опрашивают Uptime Kuma, `deploy.sh` и CI |
| `GET /metrics` | `Bearer METRICS_TOKEN` **или** access-токен `admin` | JSON: uptime, память процесса, load average, счётчики запросов по классам статуса, среднее время ответа |
| `GET /dashboard` | страница открыта, данные — по токену | HTML-дашборд с автообновлением |
| `POST /debug/sentry-test` | только `admin` | тестовая ошибка: ответ 500, запись в журнал и событие в GlitchTip |

Метрики закрыты токеном, потому что раскрывают версию Node, память и профиль трафика.
Токен сравнивается через `crypto.timingSafeEqual`, неверные попытки пишутся в журнал безопасности.

### Журналы

`winston` пишет в консоль, в файлы с ротацией и — если задан `LOKI_URL` — в Loki
(метки `app=gtd-task-service`, `env`, `stream=app|security`, `level`). Срок хранения в Loki — 14 дней.
Дашборд Grafana «GTD Task Service — журналы и запросы» подключается автоматически (provisioning):
число запросов, ответов 5xx и 4xx, событий безопасности, запросы по кодам ответа, среднее и
максимальное время ответа, события безопасности по типам, ленты ошибок и журнала безопасности.

| Событие | Уровень |
|---|---|
| `server_started`, `database_connected`, `shutdown_started` | info |
| `http` — каждый запрос: метод, путь, статус, время, IP | info, для статусов ≥ 400 — warn |
| `request_rejected` — отклонённый запрос и поля с ошибкой валидации (без значений) | warn |
| журнал безопасности: `login_failed`, `invalid_token`, `rate_limit_exceeded`… | warn |
| необработанные ошибки со стеком, `uncaught_exception`, `unhandled_rejection` | error |

### Ошибки на фронтенде

Клиент подключает `@sentry/react` (`client/src/monitoring.js`): `Sentry.init` с
`VITE_SENTRY_DSN` и `ErrorBoundary` вокруг приложения. Без DSN интеграция выключена.

### Откат и ограничения

- **Откат** — push (или `git revert`) в ветку деплоя; на сервере можно вручную выполнить
  `deploy/deploy.sh <ветка>` после `git checkout` нужного коммита.
- Uptime Kuma работает на том же сервере и не сообщит о падении всего VPS; для этого нужен внешний монитор.
- Память сервера общая, поэтому у контейнеров заданы `mem_limit`, GlitchTip запущен одним процессом без Redis,
  журналы Docker ротируются, ошибки в GlitchTip хранятся 30 дней.

## Ограничения

Схема БД создаётся `sequelize.sync()` при старте, миграций нет; добавленные
позже столбцы (`contexts.isPublic`) дописываются в существующие таблицы при старте. Счётчики
rate limiting хранятся в памяти процесса и сбрасываются при перезапуске; для
нескольких экземпляров нужен общий store (например, Redis).

Описание эндпоинтов — в [API.md](API.md) и в Swagger UI (`/api-docs`).
