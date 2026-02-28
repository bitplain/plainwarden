# HANDOFF

## Что сделано

- Реализован production-ready каркас этапа 5 для AI-агента:
  - web push подписки,
  - proактивные напоминания,
  - cron-джоб генерации и доставки.
- Добавлены Prisma сущности:
  - `PushSubscription`
  - `AgentReminder`
  - enums `AgentReminderKind`, `AgentReminderChannel`
- Добавлена миграция:
  - `prisma/migrations/20260228143000_add_push_reminders/migration.sql`
- Добавлены серверные модули:
  - `src/lib/server/push-subscriptions-db.ts`
  - `src/lib/server/push-delivery.ts`
  - `src/lib/server/reminder-db.ts`
  - `src/lib/server/reminder-engine.ts`
  - `src/lib/server/reminder-orchestrator.ts`
- Добавлены API endpoints:
  - `POST /api/push/subscribe`
  - `POST /api/push/unsubscribe`
  - `POST /api/push/test`
  - `GET /api/agent/reminders`
  - `POST /api/agent/reminders/[id]/read`
  - `POST /api/cron/reminders` (защищён секретом)
- Добавлен service worker:
  - `public/sw.js`
- Добавлен клиентский hook:
  - `src/hooks/usePushNotifications.ts`
- Интеграция в терминал:
  - команды `/push enable`, `/push disable`, `/push test`
  - polling unread reminders из `/api/agent/reminders`
  - отображение reminder-сообщений в потоке консоли
- Добавлены тесты:
  - `tests/agent/reminder-engine.test.ts`
  - `tests/agent/reminder-anti-spam.test.ts`

## Что не сделано

- Не настроен внешний scheduler (Vercel Cron / system cron) — endpoint реализован, но расписание нужно включить на инфраструктуре.
- Нет server-side per-user timezone в профиле пользователя (сейчас логика по текущему `nowIso`, полученному при запуске job).
- Не реализован advanced retry queue для transient push-ошибок (текущая версия помечает reminder как pushed после попытки, чтобы не спамить повтором).

## Что требует внимания

- Необходимы переменные окружения:
  - `NEXT_PUBLIC_VAPID_PUBLIC_KEY`
  - `VAPID_PRIVATE_KEY`
  - `VAPID_SUBJECT` (например `mailto:ops@example.com`)
  - `NETDEN_CRON_SECRET`
- Для рабочей доставки нужно убедиться, что `public/sw.js` отдается без кэш-артефактов и браузер поддерживает Push API.

## Что проверить вручную

1. Выполнить миграции и перезапуск приложения.
2. В консоли выполнить `/push enable`, разрешить браузерное permission, затем `/push test`.
3. Создать просроченную/сегодняшнюю задачу и вызвать `POST /api/cron/reminders` с корректным секретом.
4. Проверить:
   - появление reminder в терминальном потоке,
   - доставку браузерного push,
   - отметку read после показа reminder.
5. Проверить, что повторный запуск cron не дублирует одинаковые reminders (dedupe).

---

## Дополнение 2026-02-28 (fix `/push test` Internal Server Error)

### Что сделано
- Добавлена централизованная валидация конфигурации push:
  - `src/lib/server/push-config.ts`
  - проверяются `VAPID_SUBJECT`, `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`
  - для некорректной/неполной конфигурации выбрасывается `PushConfigurationError`
- `push-delivery` переведён на новую проверку, чтобы не падать неявным `Error`.
- `handleRouteError` теперь маппит `PushConfigurationError` в `503` с диагностическим сообщением (вместо generic `500`).
- `/api/health` расширен проверкой push-конфига:
  - `checks.push.configured`
  - `checks.push.missing`
  - `checks.push.invalid`
- В Docker env добавлен проброс VAPID переменных в `app`-контейнер.
- Обновлены `.env.example` и `README.md` (добавлены VAPID-переменные и генерация ключей).
- Добавлены тесты:
  - `tests/push-config.test.ts`
  - доп. кейс в `tests/validators.test.ts` на `503` для push-конфигурации.

### Что не сделано
- Не добавлялась отдельная UI-диагностика в терминале для статуса push-конфига (кроме улучшенного API-ответа и health).

### Что требует внимания
- Без заполненных VAPID env `/api/push/test` теперь вернёт явный `503` и перечень missing/invalid полей.
- `NEXT_PUBLIC_VAPID_PUBLIC_KEY` должен быть доступен на этапе `build` (для клиентского subscribe), поэтому значение нужно передавать в окружение сборки.

### Что проверить вручную
1. С пустыми VAPID переменными:
   - `/api/health` показывает `checks.push.configured=false`
   - `/api/push/test` для авторизованного пользователя возвращает `503` с диагностикой.
2. С заполненными корректными VAPID переменными:
   - `/push enable` успешно подписывает браузер
   - `/push test` отправляет тестовый push без `500`.

---

## Дополнение 2026-02-28 (OpenRouter BYOK в `/settings`)

### Что сделано
- Добавлено серверное хранение OpenRouter ключа пользователя (BYOK), без `.env`:
  - Prisma: `UserLlmConfig` + enum `LlmProviderStatus`
  - миграция: `prisma/migrations/20260228113427_add_user_llm_config/migration.sql`
- Добавлены модули:
  - `src/lib/server/openrouter-secret.ts` — шифрование/дешифрование ключа (AES-256-GCM), маскирование для UI
  - `src/lib/server/openrouter-client.ts` — валидация ключа и получение списка моделей OpenRouter
  - `src/lib/server/openrouter-settings.ts` — бизнес-логика конфигурации LLM для пользователя
- Добавлен API route:
  - `GET/POST /api/agent/openrouter`
  - действия: `save_key`, `clear_key`, `set_model`, `refresh_models`
- Интеграция в агент:
  - `AgentCore` теперь принимает user-specific `openrouterApiKey` и `openrouterModel`
  - `/api/agent` и `/api/stream` подгружают runtime-конфиг из БД для текущего пользователя
- UI в `Settings`:
  - поле OpenRouter ключа
  - кнопка «Сохранить и проверить ключ»
  - маленький индикатор-лампа статуса (зелёный/красный/нейтральный)
  - выбор модели + обновление списка моделей
- Добавлены тесты:
  - `tests/openrouter-secret.test.ts`
  - `tests/openrouter-client.test.ts`

### Что не сделано
- Не добавлена отдельная таблица аудита ротации ключей (кто/когда менял ключ).
- Не добавлено принудительное ограничение выбора модели только из текущего списка (сейчас можно сохранить произвольный model id строкой через API).

### Что требует внимания
- Для шифрования можно задать отдельный секрет:
  - `OPENROUTER_KEY_ENCRYPTION_SECRET`
  - если пусто — используется `NETDEN_SESSION_SECRET`.
- Ключ в UI не отображается обратно, только маска.
- При `401` от OpenRouter статус ключа в конфиге помечается как `invalid`.

### Что проверить вручную
1. Войти под пользователем и открыть `/settings`.
2. Ввести валидный OpenRouter ключ и нажать «Сохранить и проверить ключ».
3. Убедиться, что:
   - индикатор стал зелёным,
   - показана маска ключа,
   - загрузился список моделей.
4. Выбрать модель и убедиться, что она сохраняется.
5. Ввести невалидный ключ и убедиться, что индикатор становится красным.
6. Отправить сообщение агенту и проверить, что запрос идёт через сохранённую модель.
