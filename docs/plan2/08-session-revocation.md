# P1: Механизм отзыва сессий

## Проблема

`src/lib/server/session.ts` — самодельные HMAC-токены (аналог JWT) без возможности отзыва. При logout cookie удаляется, но **токен остаётся валидным до `exp`** (7 дней).

Если токен утёк (XSS, access log, shared device) — его невозможно инвалидировать.

## Затронутые файлы

- `src/lib/server/session.ts` — добавить проверку в blacklist/whitelist
- `prisma/schema.prisma` — **[NEW]** модель `Session`
- `src/app/api/auth/logout/route.ts` — записать сессию в blacklist
- `src/middleware.ts` — проверка при каждом запросе

## Что сделать

### Вариант A: Session whitelist в БД (рекомендуется)
1. Добавить модель `Session` в Prisma:
   ```prisma
   model Session {
     id        String   @id @default(uuid())
     userId    String
     user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
     tokenHash String   @unique
     expiresAt DateTime
     createdAt DateTime @default(now())
     @@index([userId])
   }
   ```
2. При создании токена — сохранять hash в БД
3. При проверке — сверять с БД (или кешировать в memory с TTL)
4. При logout — удалять запись

### Вариант B: Blacklist (проще)
1. Хранить хеш отозванных токенов с TTL = оставшееся время жизни
2. При logout — добавлять в blacklist
3. При проверке — проверять blacklist

### Вариант C: Ротация secret (минимальный)
1. Добавить поддержку нескольких session secrets (текущий + предыдущий)
2. При «force logout all» — ротировать secret

## Риски

- Вариант A добавляет DB-запрос на каждый API-вызов (можно кешировать)
- Нужно Clean-up для expired sessions (cron или TTL)

## Сложность: Средняя
## Приоритет: 🟠 P1
