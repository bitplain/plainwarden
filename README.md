# NetDen

Mobile-first calendar workspace with AI assistant, Kanban, Notes, Daily planner, and settings.
Built with Next.js (App Router), TypeScript, Zustand, Prisma, and PostgreSQL.

## Что реализовано в v1

- Основной пользовательский поток: `Календарь + AI + Настройки`
- Бренд: `NetDen`
- Корневой маршрут `/` перенаправляет на `/calendar`
- Режимы ввода:
  - `slash` (зелёный)
  - `shell` (красный, с красной левой полосой)
- Переключение режимов:
  - десктоп: `Tab`
  - мобильный: UI-переключатель `Slash | Shell`
- `/setup` запускается явно командой из терминала на первом запуске
- После завершения первичной инициализации маршрут `/setup` скрывается
- После настройки БД и секрета — обязательная авторизация
- Гостевая консоль после сброса сессии: доступна только команда `/login`
- После входа доступна команда `/exit` для выхода обратно в гостевую консоль
- Раздел `Настройки` (`/settings`) с регулировкой размера CLI-композера
- Календарь (полный модуль с CRUD) перенесён в проект
- Shell backend ограничен read-only allowlist + лимиты timeout/output
- Модульный реестр: terminal/setup/auth/calendar

## Маршруты

- `/` — редирект на `/calendar`
- `/setup` — мастер первичной инициализации
- `/login` — вход
- `/settings` — настройки интерфейса CLI (приватно)
- `/calendar` — календарь (вкладки: календарь, ежедневник, канбан, заметки, AI)
- `POST /api/terminal/run` — запуск allowlisted shell-команд
- `GET|POST /api/events`
- `PATCH|DELETE /api/events/:id`
- `POST /api/setup/run`
- `POST /api/setup/recover`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`

## Legacy (possibly-unused)

- `src/components/Terminal.tsx` и shell/slash API оставлены для совместимости, но не являются основным пользовательским потоком.
- REST-эндпоинты заметок/канбана сохранены для совместимости и AI-инструментов, даже если отдельные страницы заметок/канбана убраны из UI.

## Переменные окружения

```env
POSTGRES_DB=netden
POSTGRES_USER=netden
POSTGRES_PASSWORD=netdenpass
POSTGRES_PORT=5432
DATABASE_URL=postgresql://netden:netdenpass@postgres:5432/netden?schema=public
NETDEN_SESSION_SECRET=local-session-secret-change-me
NEXT_PUBLIC_BUILD_SHA=dev
PROXY_PORT=8080
VAPID_SUBJECT=mailto:admin@example.com
NEXT_PUBLIC_VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
OPENROUTER_KEY_ENCRYPTION_SECRET=
```

## Локальный запуск

```bash
npm install
npm run build
npm start
```

## Docker (app + postgres + proxy)

```bash
npm run docker:up
npm run docker:ps
npm run docker:logs
```

Smoke-check:

```bash
npm run docker:smoke
```

Остановка:

```bash
npm run docker:down
# полный сброс volume
npm run docker:down:volumes
```
