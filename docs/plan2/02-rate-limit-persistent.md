# P0: Персистентный Rate-Limiting

## Проблема

Rate-limit хранится в `Map` внутри процесса Node.js (`src/lib/server/rate-limit.ts`). При рестарте сервера все счётчики обнуляются. В multi-instance окружении каждый инстанс ведёт свой отдельный счёт.

Атакующий может:
- Брутфорсить логин, дождавшись deploy/рестарта (счётчики сбросятся)
- Распределить атаку по нескольким инстансам

## Затронутые файлы

- `src/lib/server/rate-limit.ts` — рефактор хранилища
- `src/app/api/auth/login/route.ts` — использует rate-limit
- `docker-compose.yml` — возможно добавить Redis

## Что сделать

### Вариант A: Redis (рекомендуется)
1. Добавить Redis-сервис в `docker-compose.yml`
2. Реализовать `checkRateLimit()` через Redis `INCR` + `EXPIRE`
3. Сохранить in-memory fallback при отсутствии Redis (graceful degradation)

### Вариант B: PostgreSQL
1. Создать таблицу `RateLimitBucket` в Prisma schema
2. Использовать `UPSERT` с TTL через `resetAt` колонку
3. Периодическая очистка expired записей

### Вариант C: Caddy-level rate limiting (минимальный)
1. Настроить rate_limit в Caddy-конфиге для `/api/auth/*`
2. Оставить in-memory как дополнительный слой

## Риски

- Redis добавляет зависимость в инфраструктуру
- PostgreSQL-вариант создаёт нагрузку на БД при высоком трафике

## Сложность: Средняя
## Приоритет: 🔴 P0
