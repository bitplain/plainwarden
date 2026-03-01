# P0: Централизованный Middleware для авторизации и CSRF-защиты

## Проблема

В проекте **отсутствует файл `middleware.ts`**. Каждый из 49 API route-обработчиков вручную вызывает `bootstrapAuth()` → `getAuthenticatedUser()`. Это создаёт риск:

- Новый route может быть добавлен **без проверки авторизации** — и это заметят только при аудите.
- Нет единой точки для логирования, rate-limiting и CSRF-проверки.
- Все мутирующие `POST`/`PATCH`/`DELETE` эндпоинты защищены только cookie (`sameSite: "lax"`) без CSRF-токена.

## Затронутые файлы

- `src/middleware.ts` — **[NEW]** создать
- `src/app/api/*/route.ts` — убрать дублирование ручной проверки auth (49 файлов)
- `src/lib/server/auth.ts` — возможно рефактор `getAuthenticatedUser()`

## Что сделать

1. Создать `src/middleware.ts` с Next.js Middleware config:
   - Matcher: `/api/:path*` (кроме `/api/auth/login`, `/api/auth/register`, `/api/health`, `/api/setup/*`, `/api/push/subscribe`)
   - Проверять `session` cookie через `verifySessionToken()`
   - При невалидной сессии — `401 Unauthorized`
   - Для мутирующих запросов (`POST`, `PATCH`, `DELETE`, `PUT`) — проверять заголовок `Origin` или `Sec-Fetch-Site`

2. Упростить route-обработчики: убрать `await bootstrapAuth()` + `getAuthenticatedUser()` из каждого route — вместо этого читать `userId` из middleware-injected header.

3. Добавить request ID (`X-Request-Id`) для трассировки.

## Риски

- Нужно аккуратно определить whitelist маршрутов, не требующих авторизации.
- `sameSite: "lax"` предотвращает cross-origin POST через формы, но middleware даст дополнительную защиту.

## Сложность: Средняя
## Приоритет: 🔴 P0
