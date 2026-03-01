# P2: Защита от N+1 запросов в API

## Проблема

API маршруты (49 route-файлов) не используют DataLoader или batching. Kanban endpoints загружают связанные данные через Prisma `include`, но при сложных сценариях (списки с вложенными данными) возможны N+1 запросы.

Примеры:
- `listBoardsForUser` загружает все boards → columns → cards (вложенный include)
- Получение карточек с checklists + items + worklogs + dependencies

## Затронутые файлы

- `src/lib/server/kanban-db.ts` — оптимизация запросов
- `src/lib/server/json-db.ts` — проверка query patterns

## Что сделать

1. Аудит Prisma-запросов с `prisma.$queryRaw` logging в development
2. Для списков с вложенными данными — использовать `select` вместо `include` (загружать только нужные поля)
3. При необходимости — добавить DataLoader pattern для повторяющихся запросов
4. Включить Prisma query logging в dev режиме для отслеживания

## Сложность: Средняя
## Приоритет: 🟡 P2
