# NetDen

Mobile-first calendar workspace with AI assistant, Kanban, Notes, and settings.
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
- Раздел `Настройки` (`/settings`) с production-настройками интерфейса (`Density`, `Motion`, `Sidebar behavior`) и отдельной вкладкой `Календарь` для `Export .ics`
- Календарь (полный модуль с CRUD) перенесён в проект
- Shell backend ограничен read-only allowlist + лимиты timeout/output
- Модульный реестр: terminal/setup/auth/calendar

## Маршруты

- `/` — редирект на `/calendar`
- `/setup` — мастер первичной инициализации
- `/login` — вход
- `/settings` — настройки интерфейса и календаря (приватно)
- `/calendar` — календарь (вкладки: календарь, канбан, заметки, AI)
- `POST /api/terminal/run` — запуск allowlisted shell-команд
- `GET|POST /api/events`
- `PATCH|DELETE /api/events/:id`
- `GET /api/push/status`
- `POST /api/push/setup`
- `POST /api/push/subscribe`
- `POST /api/push/unsubscribe`
- `POST /api/push/test`
- `POST /api/cron/reminders` (через `x-netden-cron-secret`)
- `POST /api/setup/run`
- `POST /api/setup/recover`
- `GET /api/setup/preset?mode=docker|remote`
- `GET /api/setup/emergency/state` (legacy, `410 Gone`)
- `POST /api/setup/emergency/reset` (legacy, `410 Gone`)
- `POST /api/setup/emergency/factory-reset`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`

## Emergency Recovery Security Warning

Основной аварийный сценарий: `POST /api/setup/emergency/factory-reset`.
Он полностью удаляет пользовательские данные и возвращает систему к старту через `/register`.

`GET /api/setup/emergency/state` и `POST /api/setup/emergency/reset` сохранены только как
legacy-контракты и отвечают `410 Gone` с указанием перейти на `factory-reset`.

Используйте аварийный reset только в доверенной self-hosted среде. На публично доступных
инсталляциях этот режим повышает риск несанкционированного захвата.

Если у вас нет доступа к продовым Variables, auth теперь работает в fallback-режиме:
секрет сессий детерминированно выводится из `DATABASE_URL` (или из короткого секрета через SHA-256).
Проверьте текущий режим через `GET /api/health` в поле `checks.session.mode`.
Рекомендуется всё равно задать сильный `NETDEN_SESSION_SECRET` при первой возможности.

Cookie авторизации теперь автоматически подстраивается под протокол запроса
(`https` или `x-forwarded-proto`), чтобы избежать `Unauthorized` в self-hosted окружениях без TLS.

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
NETDEN_CRON_SECRET=
OPENROUTER_KEY_ENCRYPTION_SECRET=
```

## Push reminders (production flow)

1. Откройте `Settings -> Календарь -> Push Notifications` и нажмите `Auto setup push`.
2. Нажмите `Enable push`, затем `Send test`.
3. Настройте внешний cron (каждые 5 минут) на:
   - `POST /api/cron/reminders`
   - заголовок `x-netden-cron-secret: <NETDEN_CRON_SECRET>`
4. При необходимости можно использовать ручной env-конфиг:
   - `VAPID_SUBJECT` (`mailto:` или `https://`)
   - `NEXT_PUBLIC_VAPID_PUBLIC_KEY`
   - `VAPID_PRIVATE_KEY`
   - `NETDEN_CRON_SECRET`
5. Диагностика конфига доступна в:
   - `GET /api/push/status`
   - `GET /api/health` (`checks.push`, `checks.cron`)

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

## Production deploy via GitHub Actions

Ручной деплой выполняется через GitHub Actions workflow `.github/workflows/docker-build-deploy.yml` (триггер `workflow_dispatch`).

Перед запуском workflow добавьте GitHub Secrets:

- `DOCKERHUB_TOKEN` — Docker Hub Access Token для пользователя `kaiots`
- `SSH_PRIVATE_KEY` — приватный ключ для подключения к серверу
- `SSH_HOST` — адрес сервера
- `SSH_USER` — пользователь SSH

Что делает workflow:

1. Собирает Docker-образ и пушит `kaiots/web_cal:latest` в Docker Hub.
2. Подключается по SSH к серверу и синхронизирует репозиторий в `/opt/web_cal/plainwarden`:
   - если каталога нет: `git clone --depth 1 --branch main https://github.com/bitplain/plainwarden.git /opt/web_cal/plainwarden`
   - если каталог есть: `git fetch` + `git checkout main` + `git pull --ff-only`
3. После синхронизации выполняет deploy:
   - `export APP_IMAGE=kaiots/web_cal:latest`
   - `docker compose -f docker-compose.yml -f docker-compose.prod.yml pull app`
   - `docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --remove-orphans --wait --no-build`
   - `curl -fsS http://localhost:${PROXY_PORT:-8080}/api/health >/dev/null`

`docker-compose.prod.yml` переопределяет `app` на prebuilt image и исключает сборку приложения на сервере.
