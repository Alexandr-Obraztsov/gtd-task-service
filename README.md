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

## Структура

```
src/
  config/        env.js — все переменные окружения в одном месте; database.js — Sequelize
  models/        User, RefreshToken, Context, Task и связи между ними
  services/      бизнес-логика: auth, token, user, context, task, accessPolicy
  controllers/   тонкие обработчики HTTP: читают req.validated, вызывают сервис
  routes/        маршруты и цепочки middleware
  middleware/    authenticate, roleGuard, validate, requireJson, sanitizeBody,
                 rateLimiters, cors, requestLogger, errorHandler
  validators/    Joi-схемы и русские сообщения об ошибках
  utils/         иерархия AppError, логгеры, токены, пароли, роли, санитизация
  app.js         фабрика Express-приложения
  server.js      запуск: подключение к БД, sync, listen, graceful shutdown
scripts/seed.js  создание admin/moderator/user из переменных окружения
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

Папка «07. Rate limiting» исчерпывает лимит попыток входа с текущего IP на
`RATE_LIMIT_WINDOW_MINUTES` минут — её запускают последней или перезапускают сервер.

## Ролевая модель

`roleGuard(requiredRole)` пропускает пользователя, если его роль не ниже требуемой:
`user (1) < moderator (2) < admin (3)`. Роль берётся из БД при каждом запросе,
а не из токена, поэтому понижение роли действует сразу.

| Действие | user | moderator | admin |
|---|---|---|---|
| CRUD своих задач и контекстов | да | да | да |
| Чтение чужих задач и контекстов | нет (403 + запись в журнал) | да | да |
| Изменение чужих задач и контекстов | нет | нет | нет |
| Удаление чужих задач и контекстов | нет | нет | да |
| `GET /users`, `GET /users/:id` | нет | да | да |
| `PATCH /users/:id/role`, `DELETE /users/:id` | нет | нет | да |

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
| XSS | helmet + удаление HTML-тегов из всех строк тела запроса (кроме пароля); ответы только `application/json` с `nosniff` |
| Журнал подозрительных действий | `logs/security-*.log` и консоль: неудачные входы, блокировки, недействительные токены, повторное использование refresh-токена, нехватка роли, доступ к чужим ресурсам, превышение лимитов, отклонённые CORS-источники, попытки mass assignment |

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

См. `.env.example`. Обязательные: `JWT_SECRET`, `JWT_REFRESH_SECRET` (≥ 32 символов,
различные), `DATABASE_URL`. Остальные имеют значения по умолчанию.

## Ограничения

Схема БД создаётся `sequelize.sync()` при старте, миграций нет. Счётчики
rate limiting хранятся в памяти процесса и сбрасываются при перезапуске; для
нескольких экземпляров нужен общий store (например, Redis).

Описание эндпоинтов — в [API.md](API.md).
