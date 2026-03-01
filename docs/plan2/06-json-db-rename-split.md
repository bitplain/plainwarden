# P1: Переименование и разделение json-db.ts

## Проблема

`src/lib/server/json-db.ts` (801 строка):
- Имя `json-db` вводит в заблуждение — файл работает с **Prisma/PostgreSQL**, не с JSON-файлами
- Содержит две разные ответственности: user management + calendar events CRUD
- Самый большой серверный файл после `kanban-db.ts`

## Затронутые файлы

- `src/lib/server/json-db.ts` — **[DELETE]** после разделения
- `src/lib/server/users-db.ts` — **[NEW]**
- `src/lib/server/events-db.ts` — **[NEW]**
- Все файлы, импортирующие из `json-db.ts` (auth.ts, route handlers, и др.)

## Что сделать

1. Создать `src/lib/server/users-db.ts`:
   - `hasUsers()`, `findUserByEmail()`, `findUserById()`, `createUserRecord()`, `seedEventsForUser()`
   - `DbConflictError`, `DbStateError`, `toPersistedUser()`

2. Создать `src/lib/server/events-db.ts`:
   - Все event-related функции: `listEventsByUser()`, `createEventForUser()`, `updateEventForUser()`, `deleteEventForUser()`
   - Helper-типы и функции: `toPublicEvent()`, `mergeSeriesDefaults()`, `buildEventUpdateData()` и т.д.

3. Обновить все import-ы (grep по `from "@/lib/server/json-db"`)

4. Удалить `json-db.ts`

## Риски

- Чисто механический рефакторинг, низкий риск
- Нужно проверить circular imports между `users-db.ts` и `events-db.ts` (seed events зависит от mock-data)

## Сложность: Низкая
## Приоритет: 🟠 P1
