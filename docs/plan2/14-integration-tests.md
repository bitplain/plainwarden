# P2: Интеграционные тесты для DB Layer

## Проблема

Есть unit-тесты для: validators, session, rate-limit, kanban-validators, push-config, openrouter, agent (tools), calendar UI.

**Нет тестов для:**
- `json-db.ts` / `events-db.ts` — CRUD operations с Prisma
- `kanban-db.ts` — Kanban CRUD, move cards, dependencies, worklogs
- `notes-db.ts` — Notes CRUD, versions, links
- API route handlers — end-to-end тесты
- React-компоненты — нет component tests

## Затронутые файлы

- `tests/db/` — **[NEW]** интеграционные тесты
- `tests/api/` — **[NEW]** route handler тесты
- `vitest.config.ts` — возможно отдельный config для интеграционных тестов
- `docker-compose.test.yml` — **[NEW]** тестовая БД

## Что сделать

1. Настроить тестовую PostgreSQL (Docker или in-memory через pg-mem)
2. Создать `tests/db/events-db.test.ts`:
   - Создание/чтение/обновление/удаление событий
   - Recurrence series
   - Event filters
3. Создать `tests/db/kanban-db.test.ts`:
   - Board/column/card CRUD
   - Move cards between columns
   - Dependencies validation
4. Создать `tests/db/notes-db.test.ts`:
   - CRUD, versioning, links
5. Добавить npm script: `npm run test:integration`

## Сложность: Высокая
## Приоритет: 🟡 P2
