# Обзор плана рефакторинга (docs/plan2)

## Критические (P0) — Безопасность

| # | Задача | Файл | Сложность |
|---|--------|------|-----------|
| 01 | [Middleware для auth + CSRF](01-middleware-auth-csrf.md) | `src/middleware.ts` [NEW] | Средняя |
| 02 | [Персистентный rate-limit](02-rate-limit-persistent.md) | `src/lib/server/rate-limit.ts` | Средняя |
| 03 | [SSL с проверкой сертификата](03-ssl-certificate-validation.md) | `src/lib/server/setup.ts` | Низкая |

## Серьёзные (P1) — Архитектура и масштабируемость

| # | Задача | Файл | Сложность |
|---|--------|------|-----------|
| 04 | [Рефакторинг Terminal.tsx](04-terminal-refactor.md) | `src/components/Terminal.tsx` | Высокая |
| 05 | [Разделение globals.css](05-globals-css-split.md) | `src/app/globals.css` | Средняя |
| 06 | [Переименование json-db.ts](06-json-db-rename-split.md) | `src/lib/server/json-db.ts` | Низкая |
| 07 | [Пагинация в Kanban/Notes](07-kanban-pagination.md) | `src/lib/server/kanban-db.ts` | Средняя |
| 08 | [Отзыв сессий](08-session-revocation.md) | `src/lib/server/session.ts` | Средняя |
| 09 | [Docker — prod deps](09-docker-production-deps.md) | `Dockerfile` | Низкая |

## Заметные (P2) — Качество кода

| # | Задача | Файл | Сложность |
|---|--------|------|-----------|
| 10 | [Объединение валидации](10-validation-unification.md) | `src/lib/server/validators.ts` | Средняя |
| 11 | [Error Boundaries](11-error-boundaries.md) | `src/app/error.tsx` [NEW] | Низкая |
| 12 | [Structured logging](12-structured-logging.md) | `src/utils/logger.ts` | Средняя |
| 13 | [State management](13-state-management.md) | `src/lib/store.tsx` | Высокая |
| 14 | [Интеграционные тесты](14-integration-tests.md) | `tests/db/` [NEW] | Высокая |
| 15 | [Date format migration](15-date-format-migration.md) | `prisma/schema.prisma` | Высокая |
| 16 | [N+1 query protection](16-n-plus-one-queries.md) | `src/lib/server/kanban-db.ts` | Средняя |

## Рекомендуемый порядок реализации

1. **01** → Middleware (основа для всего остального)
2. **06** → json-db rename (низкий риск, улучшает навигацию)
3. **03** → SSL validation (быстрый fix)
4. **09** → Docker deps (быстрый fix)
5. **11** → Error boundaries (быстрый fix)
6. **02** → Rate-limit (зависит от решения Redis vs PG)
7. **08** → Session revocation
8. **10** → Validation unification
9. **12** → Structured logging
10. **05** → CSS split
11. **04** → Terminal refactor
12. **07** → Pagination
13. **16** → N+1 queries
14. **13** → State management
15. **14** → Integration tests
16. **15** → Date format migration
