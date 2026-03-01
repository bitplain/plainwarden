# P1: Пагинация в Kanban и Notes API

## Проблема

`src/lib/server/kanban-db.ts` (830 строк) и `src/lib/server/notes-db.ts` — ни один из запросов `listBoardsForUser()`, `listCardsInColumn()`, getNotes и др. не имеет пагинации или лимита результатов.

При росте данных это приведёт к:
- Замедлению API ответов
- Высокому потреблению памяти
- Потенциальному OOM при больших объёмах

## Затронутые файлы

- `src/lib/server/kanban-db.ts` — все `list*` функции
- `src/lib/server/notes-db.ts` — `listNotes()`
- `src/lib/server/json-db.ts` — `listEventsByUser()` (уже поддерживает фильтры, но без limit)
- `src/app/api/kanban/*/route.ts` — парсинг query-параметров `page`/`limit`
- `src/app/api/notes/route.ts` — аналогично
- `src/lib/api.ts` — клиентский API
- `src/lib/types.ts` — типы пагинации

## Что сделать

1. Определить общий тип пагинации:
   ```typescript
   interface PaginationParams { page?: number; limit?: number; }
   interface PaginatedResponse<T> { items: T[]; total: number; page: number; limit: number; }
   ```

2. Добавить `take` / `skip` в Prisma-запросы:
   - `listBoardsForUser(userId, { page, limit })`
   - `listCardsInColumn(columnId, userId, { page, limit })`
   - Дефолтный limit: 50, максимальный: 200

3. Обновить API route handlers для парсинга query params

4. Обновить клиентский `ApiClient` для поддержки пагинации

5. Обновить UI-компоненты для infinite scroll или pagination controls

## Риски

- Breaking change для клиентского API (обёртка `PaginatedResponse`)
- Нужно решить: offset-based vs cursor-based пагинация

## Сложность: Средняя
## Приоритет: 🟠 P1
