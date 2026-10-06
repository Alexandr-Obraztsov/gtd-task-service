# API GTD Task Service

Базовый URL: `http://localhost:3000`. Все тела запросов и ответов — JSON
(`Content-Type: application/json`). Защищённые маршруты требуют заголовок
`Authorization: Bearer <accessToken>`.

## Формат ошибок

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Некорректные данные запроса",
    "details": [
      { "location": "body", "field": "email", "message": "\"email\" должно быть корректным email" }
    ]
  }
}
```

`details` есть только у ошибок валидации. В development у ошибок 500 добавляется `debug`.

| HTTP | code | Когда |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Не прошла Joi-валидация, лишнее поле, некорректный JSON, `scheduled` без `dueDate` |
| 401 | `TOKEN_MISSING` | Нет заголовка `Authorization` |
| 401 | `TOKEN_INVALID` | Подпись, формат или тип токена неверны, пользователь удалён |
| 401 | `TOKEN_EXPIRED` | Истёк access-токен — вызвать `/auth/refresh` |
| 401 | `INVALID_CREDENTIALS` | Неверный email или пароль |
| 401 | `REFRESH_TOKEN_MISSING` / `REFRESH_TOKEN_INVALID` | Нет cookie или токен отозван, истёк, подделан |
| 403 | `INSUFFICIENT_ROLE` | Роль ниже требуемой |
| 403 | `FOREIGN_RESOURCE` | Обращение к чужой задаче или контексту |
| 403 | `CORS_REJECTED` | `Origin` не входит в `CORS_ORIGINS` |
| 404 | `NOT_FOUND` | Нет ресурса или маршрута |
| 409 | `CONFLICT` | Email уже занят, дубликат контекста, попытка изменить свою роль или удалить себя |
| 413 | `PAYLOAD_TOO_LARGE` | Тело больше `BODY_LIMIT` (10 КБ) |
| 415 | `UNSUPPORTED_MEDIA_TYPE` | Тело не `application/json` |
| 423 | `ACCOUNT_LOCKED` | 5 неудачных входов подряд; заголовок `Retry-After` в секундах |
| 429 | `TOO_MANY_REQUESTS` | Превышен лимит; заголовки `RateLimit`, `RateLimit-Policy` |
| 500 | `INTERNAL_ERROR` | Непредвиденная ошибка |

## Пагинация

Списки принимают `limit` (1–100, по умолчанию 20) и `offset` (≥ 0) и возвращают:

```json
{ "items": [ ... ], "total": 42, "limit": 20, "offset": 0 }
```

---

## Аутентификация

### POST /auth/register — публичный

Тело: `email` (до 254 символов), `password` (8–72 символа, буква, цифра, спецсимвол).
Другие поля запрещены. Роль всегда `user`.

```json
{ "email": "ivan@example.com", "password": "Str0ng!pass" }
```

`201`:

```json
{ "user": { "id": 4, "email": "ivan@example.com", "role": "user",
            "createdAt": "2026-10-06T08:16:28.081Z", "updatedAt": "2026-10-06T08:16:28.081Z" } }
```

Ошибки: 400, 409, 413, 415, 429.

### POST /auth/login — публичный

```json
{ "email": "ivan@example.com", "password": "Str0ng!pass" }
```

`200` + cookie `refreshToken` (`HttpOnly; SameSite=Strict; Path=/auth`):

```json
{ "user": { "id": 4, "email": "ivan@example.com", "role": "user", "createdAt": "…", "updatedAt": "…" },
  "accessToken": "eyJhbGciOiJIUzI1NiIs…", "tokenType": "Bearer" }
```

Ошибки: 400, 401 `INVALID_CREDENTIALS`, 423 `ACCOUNT_LOCKED`, 429.

### POST /auth/refresh — cookie `refreshToken`

Тело не требуется. Отзывает предъявленный refresh-токен и выдаёт новую пару:
ответ как у `/auth/login`. Повторное предъявление отозванного токена отзывает
все сессии пользователя. Ошибки: 401 `REFRESH_TOKEN_MISSING` / `REFRESH_TOKEN_INVALID`, 429.

### POST /auth/logout — cookie `refreshToken`

Отзывает refresh-токен и очищает cookie. `204` без тела.

### GET /auth/me — любая роль

`200`: `{ "user": { "id": 4, "email": "…", "role": "user", "createdAt": "…", "updatedAt": "…" } }`.
Ошибки: 401.

---

## Пользователи

### GET /users — moderator, admin

Query: `role` (`user` | `moderator` | `admin`), `limit`, `offset`.

```
GET /users?role=user&limit=10
```

`200`: страница пользователей. Ошибки: 400, 401, 403 `INSUFFICIENT_ROLE`.

### GET /users/:id — moderator, admin

`200`: `{ "id": 3, "email": "user@gtd.local", "role": "user", "createdAt": "…", "updatedAt": "…" }`.
Ошибки: 400, 401, 403, 404.

### PATCH /users/:id/role — admin

```json
{ "role": "moderator" }
```

`200`: пользователь с новой ролью. Ошибки: 400, 401, 403, 404, 409 (своя роль).

### DELETE /users/:id — admin

`204`. Вместе с пользователем удаляются его задачи, контексты и refresh-токены.
Ошибки: 400, 401, 403, 404, 409 (удаление себя).

---

## Контексты

Имя: начинается с `@`, затем буквы, цифры, `_`, `-`; длина 2–50; уникально у владельца.

### GET /contexts — любая роль

Query: `ownerId`, `limit`, `offset`. `user` видит только свои; `ownerId` чужого
пользователя даёт 403. `moderator` и `admin` видят все или контексты указанного `ownerId`.

### POST /contexts — любая роль

```json
{ "name": "@office" }
```

`201`:

```json
{ "id": 4, "name": "@office", "ownerId": 4, "createdAt": "…", "updatedAt": "…" }
```

Ошибки: 400, 401, 409.

### GET /contexts/:id — владелец, moderator, admin

`200` или 400, 401, 403 `FOREIGN_RESOURCE`, 404.

### PATCH /contexts/:id — владелец

Тело как у POST. `200` или 400, 401, 403, 404, 409.

### DELETE /contexts/:id — владелец, admin

`204`. У задач этого контекста `contextId` становится `null`. Ошибки: 400, 401, 403, 404.

---

## Задачи

| Поле | Тип | Правила |
|---|---|---|
| `title` | string | 1–200 символов, обязательно при создании |
| `notes` | string | до 2000 символов |
| `status` | enum | `inbox` (по умолчанию), `next`, `waiting`, `scheduled`, `someday`, `done` |
| `dueDate` | ISO 8601 \| null | обязательна для `scheduled` |
| `remindAt` | ISO 8601 \| null | момент напоминания |
| `contextId` | integer \| null | контекст владельца задачи |

`ownerId`, `id`, `createdAt`, `updatedAt` задаёт сервер; попытка передать их — 400.

### GET /tasks — любая роль

Query: `status`, `contextId`, `ownerId`, `dueBefore` (ISO 8601), `limit`, `offset`.
Правила `ownerId` — как у контекстов. Сортировка: `dueDate` (пустые в конце), затем `id`.

```
GET /tasks?status=next&contextId=4
```

```json
{ "items": [ { "id": 4, "title": "Подготовить отчёт", "notes": "", "status": "next",
               "dueDate": null, "remindAt": "2020-01-01T10:00:00.000Z", "contextId": 4,
               "ownerId": 4, "createdAt": "…", "updatedAt": "…" } ],
  "total": 1, "limit": 20, "offset": 0 }
```

Ошибки: 400 (например, `status=wrong`), 401, 403.

### GET /tasks/reminders/due — любая роль

Собственные задачи с `remindAt <= now` и статусом не `done`, по возрастанию
`remindAt`. Query: `limit`, `offset`. Ответ — страница задач.

### POST /tasks — любая роль

```json
{ "title": "Подготовить отчёт", "notes": "Раздел 3", "status": "next",
  "contextId": 4, "remindAt": "2026-10-07T09:00:00Z" }
```

`201`: созданная задача. HTML-теги в строках удаляются:
`"<script>alert(1)</script>Купить <b>хлеб</b>"` сохраняется как `"Купить хлеб"`.
Ошибки: 400, 401, 404 (контекст не принадлежит пользователю), 413, 415.

### GET /tasks/:id — владелец, moderator, admin

`200` или 400, 401, 403 `FOREIGN_RESOURCE`, 404.

### PATCH /tasks/:id — владелец

Любое непустое подмножество полей задачи.

```json
{ "status": "waiting", "notes": "Жду данные" }
```

`200`: обновлённая задача. Ошибки: 400, 401, 403, 404.

### DELETE /tasks/:id — владелец, admin

`204` или 400, 401, 403, 404.

---

## Служебное

### GET /health — публичный

`200`: `{ "status": "ok" }`.
