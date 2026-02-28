# Аудит кода проекта NetDen (plainwarden)

## Общая оценка

Проект представляет собой self-hosted терминальное рабочее пространство с календарём, заметками, управлением SSL-сертификатами и интеграцией GitHub Billing. Стек: Next.js 16 (App Router), TypeScript (strict), Zustand, Prisma 7, PostgreSQL, Caddy (reverse proxy), Docker Compose.

Общее качество кода — выше среднего. Хорошая валидация входных данных, granuальный rate-limiting, timing-safe сравнения, CSP заголовки, allowlist для shell-команд. Однако есть ряд архитектурных и безопасностных слабостей.

---

## КРИТИЧЕСКИЕ ПРОБЛЕМЫ

### 1. Middleware не подключён — защита маршрутов не работает
**Файл:** `src/proxy.ts`

Файл `proxy.ts` реализует полноценную логику middleware (проверка сессии, редиректы для неавторизованных, блокировка setup после инициализации), но:
- Файл **не экспортируется как middleware Next.js** (нет `middleware.ts` в корне `src/` или проекта).
- Next.js App Router требует файл `middleware.ts` в корне проекта или `src/middleware.ts`.
- **Результат:** Все защищённые страницы (`/calendar`, `/settings`, `/home`, `/notes`, `/calendar2`) доступны без авторизации через браузер. Единственная защита — на уровне API-маршрутов, но клиентские страницы рендерятся без проверки.

**Серьёзность:** КРИТИЧЕСКАЯ — данные не утекают (API защищён), но UI полностью открыт.

### 2. GitHub Token передаётся в body запроса и хранится в localStorage
**Файлы:** `src/app/api/github/billing/route.ts`, `src/app/home/page.tsx`

- GitHub PAT отправляется клиентом в теле POST-запроса.
- Токен хранится в `localStorage` (`netden:github:token`).
- `localStorage` уязвим к XSS. Если `unsafe-inline` в CSP будет обойдён, токен утечёт.
- Токен должен храниться на сервере (например, в зашифрованном поле `IntegrationConfig`).

**Серьёзность:** ВЫСОКАЯ

### 3. `rejectUnauthorized: false` в TLS-соединениях
**Файлы:** `src/lib/server/setup.ts` (строка 162), `src/lib/server/acme.ts` (строка 433)

- При SSL-подключении к PostgreSQL и при TLS-пробе ACME сертификатов используется `rejectUnauthorized: false`.
- Это открывает возможность MITM-атаки.
- В setup.ts есть комментарий-обоснование, но для production-среды это неприемлемо.

**Серьёзность:** ВЫСОКАЯ (для production-деплоя)

---

## АРХИТЕКТУРНЫЕ СЛАБОСТИ

### 4. Дублирование `normalizeEmail` — 3 копии
**Файлы:**
- `src/lib/server/auth.ts:20`
- `src/lib/server/json-db.ts:46`
- `src/lib/server/acme.ts:102`

Одна и та же функция `normalizeEmail` определена в трёх местах. Должна быть единственная реализация в общем утилитарном модуле.

### 5. Дублирование `isRecord` — 5+ копий
**Файлы:** `validators.ts`, `acme.ts`, `github-billing.ts`, `home/page.tsx`, `acme/config/route.ts`, `github/billing/route.ts`

Одинаковая type-guard-функция разбросана по всему проекту.

### 6. Дублирование `readString` — множественные реализации
Функция `readString` с разной сигнатурой реализована в:
- `validators.ts` (с `required`/`maxLength`)
- `setup.ts` (как `readRequiredString`/`readOptionalString`)
- `acme/config/route.ts`
- `github/billing/route.ts`

### 7. Файл `json-db.ts` — неудачное именование и чрезмерная ответственность
**Файл:** `src/lib/server/json-db.ts` (785 строк)

- Название `json-db` вводит в заблуждение — на самом деле это полноценный data access layer для Prisma/PostgreSQL.
- Файл содержит логику для users, events, event series, seeding — всё в одном месте.
- Сложные методы (updateEventForUser — ~270 строк) трудно тестировать и поддерживать.
- Рекомендуется разделить на `user-repository.ts`, `event-repository.ts`, `event-series-repository.ts`.

### 8. In-memory rate limiter не работает при масштабировании
**Файл:** `src/lib/server/rate-limit.ts`

- Rate limiter использует `Map` в памяти процесса.
- При горизонтальном масштабировании (несколько инстансов) каждый процесс имеет свой rate limiter — ограничения легко обойти.
- Для production нужен Redis-based rate limiter или аналог.

### 9. Два параллельных модуля календаря
**Директории:** `src/components/calendar/` и `src/components/calendar2/`

- Существуют два полноценных модуля календаря: legacy `Calendar` и новый `Calendar2`.
- Обе версии работают с одними и теми же данными (`/api/events`).
- Дублирование типов: `calendar-types.ts` и `calendar2-types.ts`.
- Неясно, какой из модулей является основным. Legacy-календарь встроен в терминал (`/calendar`), Calendar2 живёт на отдельной странице (`/calendar2`).
- Рекомендация: определить основной модуль и удалить/задепрекейтить второй.

### 10. Zustand store vs. Calendar2 store — несогласованность управления состоянием
- Основной store (`src/lib/store.tsx`) управляет событиями через Zustand + Context.
- Calendar2 использует собственный store (`calendar2-store.ts`) с собственным Zustand-инстансом.
- Два независимых источника истины для одних и тех же данных могут привести к рассинхронизации.

### 11. Terminal.tsx — монолитный компонент (~920 строк)
**Файл:** `src/components/Terminal.tsx`

Компонент содержит:
- Логику авторизации (login form)
- Shell-режим и slash-режим
- Управление панелями (calendar, home, notes, settings)
- Логику embed-iframe
- Масштабирование CLI
- Историю команд

Это затрудняет тестирование, отладку и рефакторинг. Рекомендуется разбить на:
- `TerminalShell` (история + ввод)
- `TerminalAuthForm`
- `TerminalPanelManager`
- Кастомные хуки: `useTerminalAuth`, `useTerminalInput`, `useCliScale`

---

## БЕЗОПАСНОСТЬ

### 12. Нет CSRF-защиты для мутирующих API-эндпоинтов
Все POST/PATCH/DELETE эндпоинты используют только cookie-based аутентификацию без CSRF-токена. Заголовок `x-netden-terminal: 1` используется только для `/api/terminal/run`, но не является полноценной CSRF-защитой.

**Рекомендация:** Добавить проверку `Origin`/`Referer` заголовков или использовать double-submit cookie pattern.

### 13. CSP содержит `'unsafe-inline'` для скриптов
**Файл:** `next.config.ts:9`

`script-src 'self' 'unsafe-inline'` позволяет XSS через inline-скрипты. Next.js требует `unsafe-inline` для гидратации в production, но стоит рассмотреть использование nonce-based подхода.

### 14. Setup endpoint доступен без аутентификации
**Файл:** `src/app/api/setup/run/route.ts`

- Единственная защита — проверка `isDatabaseConfigured()`.
- Если DATABASE_URL не задан, **любой** может запустить setup-процесс и получить полный доступ к базе.
- В контексте self-hosted это допустимо (first-run), но при деплое с пустым DATABASE_URL это риск.

### 15. Отсутствие rate limiting на ряде эндпоинтов
Эндпоинты без rate limiting:
- `POST /api/setup/run`
- `POST /api/setup/recover`
- `POST /api/integrations/acme/config`
- `POST /api/integrations/acme/issue`
- `POST /api/github/billing`
- `GET /api/events/export.ics`

### 16. `server-only` не используется в серверных модулях
Директива `import "server-only"` используется только в `shell/run.ts`. Остальные серверные файлы (`session.ts`, `auth.ts`, `json-db.ts`, `setup.ts` и т.д.) не защищены от случайного импорта в клиентский код.

---

## КАЧЕСТВО КОДА

### 17. Нет pagination для списка событий
**Файл:** `src/lib/server/json-db.ts:305` — `listEventsByUser`

- Запрос возвращает **все** события пользователя без пагинации.
- При большом количестве событий (особенно с recurring series по 400 occurrences) это может привести к проблемам производительности.

### 18. Mock data с фиксированными датами
**Файл:** `src/lib/mock-data.ts`

- Seed-данные содержат жёстко закодированные даты (февраль-март 2026).
- При регистрации в другое время года эти данные будут нерелевантны.
- Лучше генерировать seed-данные относительно текущей даты.

### 19. `date` хранится как строка, а не как DATE в PostgreSQL
**Файл:** `prisma/schema.prisma:37`

- Поле `date` имеет тип `String` вместо `DateTime` или нативного SQL `DATE`.
- Это затрудняет SQL-запросы по диапазонам дат, сортировку и валидацию на уровне БД.
- Сравнение строк `"2026-02-27"` работает для ISO-формата, но неидеоматично.

### 20. `time` хранится как `String?` вместо `TIME`
Аналогично — поле `time` как строка не валидируется на уровне БД.

### 21. Отсутствие индексов для текстового поиска
- `buildEventListWhereInput` использует `contains` с `mode: "insensitive"` для полнотекстового поиска.
- В PostgreSQL это приведёт к sequential scan без GIN/trigram-индекса.
- При росте данных поиск станет медленным.

### 22. `bootstrapAuth()` вызывается в каждом API-хэндлере
Каждый API-маршрут начинается с `await bootstrapAuth()`. Это проверка, что DB настроена и есть пользователи. Лучше вынести в middleware или общую обёртку.

### 23. Отсутствие логирования в structured-формате
- Используется `console.error` / `console.warn` без структурированного формата.
- В production рекомендуется использовать structured logging (JSON) для интеграции с log-агрегаторами.

### 24. `register` в store вызывает `login` после себя — двойной сетевой запрос
**Файл:** `src/lib/store.tsx:118`

```
register: async (input) => {
  await api.register(input);       // POST /auth/register → устанавливает cookie
  await get().login({...});         // POST /auth/login → заново проверяет credentials
}
```

Регистрация уже возвращает сессию, повторный login не нужен.

### 25. `.DS_Store` файлы в репозитории
В git есть файлы `.DS_Store`. Рекомендуется добавить в `.gitignore` и удалить из репозитория.

### 26. Отсутствие E2E / Integration тестов
- Все 108 тестов — unit-тесты для утилитарных функций.
- Нет тестов для API-маршрутов (integration).
- Нет E2E тестов (Playwright/Cypress) для критических user-flow (setup → register → login → CRUD событий).

### 27. `PersistedUser` включает `passwordHash` — риск утечки через логирование
**Файл:** `src/lib/types.ts:39`

`PersistedUser` содержит `passwordHash`. Хотя `sanitizeUser` используется перед отправкой клиенту, при случайном логировании объекта `PersistedUser` хеш утечёт в логи.

---

## ИНФРАСТРУКТУРА / DEVOPS

### 28. Dockerfile копирует полный `node_modules` в production
**Файл:** `Dockerfile:36`

```
COPY --from=deps --chown=nextjs:nodejs /app/node_modules ./node_modules
```

Весь `node_modules` (включая devDependencies) копируется в production-образ. Это увеличивает размер образа и поверхность атаки. Рекомендуется `npm ci --omit=dev` для production layer.

### 29. Caddy Admin API открыт на `0.0.0.0:2019`
**Файл:** `docker/proxy/bootstrap.json:3`

Admin API Caddy слушает на всех интерфейсах. В production это может позволить внешним агентам перенастроить reverse proxy. Рекомендуется ограничить `127.0.0.1:2019` или использовать Docker network isolation.

### 30. Healthcheck `/api/health` не проверяет зависимости
**Файл:** `src/app/api/health/route.ts`

Endpoint возвращает `{ status: "ok" }` без проверки подключения к PostgreSQL. При падении БД healthcheck всё равно будет возвращать 200, и оркестратор не перезапустит контейнер.

### 31. `docker-compose.yml` — `app` без `restart: unless-stopped`
Сервисы `postgres` и `proxy` имеют `restart: unless-stopped`, но `app` — нет. При краше Next.js-процесса контейнер не будет автоматически перезапущен.

---

## МЕЛКИЕ ЗАМЕЧАНИЯ

### 32. Несовпадение имён: plainwarden vs netden
- Репозиторий: `plainwarden`
- Приложение: `netden` (в package.json, UI, API)
- iCal PRODID: `PlainWarden`
- UID в iCal: `@plainwarden.local`

Это создаёт путаницу. Рекомендуется привести к единому неймингу.

### 33. Unused `Caddyfile`
`docker/proxy/Caddyfile` существует, но не используется — Caddy запускается через `bootstrap.json` и Admin API. Файл вводит в заблуждение.

### 34. `Calendar` компонент — logout через `window.location.href`
**Файл:** `src/components/Calendar.tsx:174`

```
window.location.href = "/login";
```

Полная перезагрузка страницы вместо использования router. Теряется клиентское состояние.

### 35. `deleteEvent` в store не обрабатывает recurring series
**Файл:** `src/lib/store.tsx:187`

```
set((state) => ({ events: state.events.filter((event) => event.id !== id) }));
```

При удалении с `scope: "all"` или `"this_and_following"` из локального массива удаляется только один event по ID, хотя на сервере удалена вся серия. Нужен re-fetch.

### 36. `NETDEN_SESSION_SECRET` имеет дефолтное значение в compose
**Файл:** `docker-compose.yml:37`

```
NETDEN_SESSION_SECRET=${NETDEN_SESSION_SECRET:-local-session-secret-change-me-32chars}
```

Дефолтный секрет в docker-compose — риск забыть заменить при деплое.

---

## ИТОГО

| Категория | Количество |
|---|---|
| Критические | 3 |
| Архитектурные | 8 |
| Безопасность | 5 |
| Качество кода | 11 |
| Инфра/DevOps | 4 |
| Мелкие | 5 |
| **Всего** | **36** |

### Приоритеты исправления:
1. **Middleware** — подключить `proxy.ts` как `src/middleware.ts` (5 минут, критический эффект)
2. **GitHub Token** — перенести хранение на сервер
3. **CSRF-защита** — добавить проверку Origin для мутирующих запросов
4. **Разделение json-db.ts** — улучшить поддерживаемость
5. **Healthcheck** — добавить проверку БД
6. **Pagination** для событий
7. **Удалить .DS_Store** из репозитория
