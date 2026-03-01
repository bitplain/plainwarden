# P2: Структурированный Logging

## Проблема

Большинство обработчиков ошибок используют `console.error`. Нет структурированного логирования (request ID, user ID, timestamps, severity levels).

В проекте есть `src/utils/logger.ts`, но он используется **только в streaming route** (`src/app/api/stream/route.ts`).

## Затронутые файлы

- `src/utils/logger.ts` — расширить
- `src/lib/server/validators.ts` — `handleRouteError()` использовать logger
- `src/lib/server/setup.ts` — `handleSetupError()` использовать logger
- `src/middleware.ts` — логирование запросов (после создания)
- Все API route handlers — заменить `console.error` на `logger`

## Что сделать

1. Расширить `logger.ts`:
   - Уровни: `debug`, `info`, `warn`, `error`
   - JSON-формат для production
   - Включить: timestamp, requestId, userId, action
2. Пробросить request ID через middleware (header `X-Request-Id`)
3. Заменить все `console.error` на `logger.error` в серверном коде
4. Добавить request logging в middleware (method, path, status, duration)

## Сложность: Средняя
## Приоритет: 🟡 P2
