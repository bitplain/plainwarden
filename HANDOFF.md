# HANDOFF

## Что сделано

- Реализован базовый production-ready каркас AI-агента поверх существующей консоли.
- Добавлены серверные API:
  - `POST /api/stream` (SSE streaming)
  - `POST /api/agent` (синхронный turn/confirm)
  - `POST /api/tools` (защищённый debug execution)
- Добавлен оркестратор `AgentCore` с:
  - автоопределением интента и релевантных модулей,
  - tool-calling через OpenRouter,
  - human-in-the-loop подтверждением мутаций,
  - базовой синхронизацией linked сущностей по `event:<id>`.
- Добавлены tools для модулей:
  - календарь, канбан, заметки, ежедневник.
- Добавлены клиентские hooks и UI-компоненты:
  - `useAgent`, `useAgentMemory`, `useLanguageDetect`
  - `AgentConsole`, `ConfirmAction`, `AgentSettings`, `StreamingMessage`
- Выполнена интеграция в существующий `Terminal` с минимальными изменениями:
  - не-slash запросы в `slash` режиме отправляются в агента,
  - отображается потоковый ответ,
  - есть подтверждение действий.
- Подготовлена архитектурная спецификация:
  - `docs/agent-architecture-v3.md`
- Подготовлен детальный план реализации:
  - `docs/plans/2026-02-28-ai-agent-orchestrator-v3.md`

## Что не сделано

- Не реализован отдельный persistent memory backend (пока memory хранится на клиенте в localStorage).
- Не реализована полноценная push-система (service worker + subscriptions + delivery backend).
- Не добавлены метрики стоимости OpenRouter в отдельное хранилище (пока только structured logs).
- Не добавлен полноценный distributed cache layer (Redis) и event bus.

## Что требует внимания

- Нужны рабочие переменные окружения для OpenRouter:
  - `OPENROUTER_API_KEY`
  - `OPENROUTER_MODEL` (опционально)
  - `OPENROUTER_HTTP_REFERER` (опционально)
  - `OPENROUTER_APP_TITLE` (опционально)
- Текущая стратегия sync считает `calendar event` canonical owner для linked-сущностей.
- Для мультипользовательности потребуется ввод `workspaceId` в схему БД и индексы.

## Что проверить вручную

1. В `Terminal` отправить не-slash запрос: убедиться в SSE-потоке текста.
2. Запросить мутацию (например, "создай заметку..."):
   - убедиться, что появляется ConfirmAction,
   - без подтверждения запись не создаётся.
3. Подтвердить действие: убедиться, что операция выполнена.
4. Запросить навигацию ("open kanban") и проверить переход.
5. Переключить настройки агента (`/agent settings`) и проверить сохранение поведения.
