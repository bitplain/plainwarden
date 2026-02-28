# AI Agent Orchestrator v3 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Встроить AI-агента поверх существующей консоли NetDen с tool-calling, стримингом, подтверждением мутаций, персонализацией и cross-module контекстом.

**Architecture:** Добавляется серверный оркестратор `AgentCore` + модульные tools (calendar/kanban/notes/daily) + SSE-стрим route. Текущий `Terminal` сохраняется, интеграция делается точечно: не-slash ввод уходит в агент, мутации подтверждаются отдельным UI-компонентом.

**Tech Stack:** Next.js App Router, React 19, TypeScript strict, Prisma, OpenRouter Chat Completions API (tool calling), SSE.

---

### Task 1: RED-тесты на ядро понимания запроса

**Files:**
- Create: `tests/agent/language-and-intent.test.ts`
- Create: `tests/agent/context-builder.test.ts`

**Step 1: Write failing tests for language detect (ru/en), intent classification, module relevance.**
**Step 2: Run tests and verify fail (missing modules).**
Run: `npm test -- tests/agent/language-and-intent.test.ts tests/agent/context-builder.test.ts`
Expected: FAIL (files/modules not found).

### Task 2: Базовые утилиты и типы агента (GREEN)

**Files:**
- Create: `src/agent/types.ts`
- Create: `src/utils/validators.ts`
- Create: `src/utils/errorHandler.ts`
- Create: `src/utils/logger.ts`
- Create: `src/utils/contextBuilder.ts`

**Step 1: Реализовать типы сообщений/действий/интентов и safe-валидацию payload.**
**Step 2: Реализовать error mapper + logger + context builder (релевантные фрагменты + globalEntityId).**
**Step 3: Run tests and verify pass.**
Run: `npm test -- tests/agent/language-and-intent.test.ts tests/agent/context-builder.test.ts`

### Task 3: Tool layer по модулям

**Files:**
- Create: `src/tools/calendar.ts`
- Create: `src/tools/kanban.ts`
- Create: `src/tools/notes.ts`
- Create: `src/tools/daily.ts`
- Create: `src/tools/index.ts`

**Step 1: Добавить read/mutate операции с проверкой владельца (userId).**
**Step 2: Добавить метаданные tools для OpenRouter function-calling.**
**Step 3: Реализовать исполнение tool-вызовов с поддержкой параллельного запуска read-tools.**

### Task 4: AgentCore + streaming + system prompt

**Files:**
- Create: `src/agent/systemPrompt.ts`
- Create: `src/agent/streaming.ts`
- Create: `src/agent/AgentCore.ts`

**Step 1: Реализовать системный промпт (персона + язык + временной контекст + policy подтверждений).**
**Step 2: Реализовать OpenRouter client (chat completions, tool-calls, retry/timeout).**
**Step 3: Реализовать цикл tool-calling (max steps), pending-action gate, sync по globalEntityId.**
**Step 4: Реализовать SSE streaming adapter.**

### Task 5: API routes агента

**Files:**
- Create: `src/app/api/agent/route.ts`
- Create: `src/app/api/tools/route.ts`
- Create: `src/app/api/stream/route.ts`

**Step 1: `agent/route.ts` — синхронный endpoint (confirm/reject, dry-run).**
**Step 2: `tools/route.ts` — защищённый endpoint отладки tool execution.**
**Step 3: `stream/route.ts` — основной SSE endpoint для чата.

### Task 6: Client hooks + UI components

**Files:**
- Create: `src/hooks/useLanguageDetect.ts`
- Create: `src/hooks/useAgentMemory.ts`
- Create: `src/hooks/useAgent.ts`
- Create: `src/components/StreamingMessage.tsx`
- Create: `src/components/ConfirmAction.tsx`
- Create: `src/components/AgentSettings.tsx`
- Create: `src/components/AgentConsole.tsx`

**Step 1: Hooks для session memory/settings/language.**
**Step 2: Компоненты потока и подтверждения.**
**Step 3: AgentConsole с кнопками Confirm/Decline и navigation callbacks.

### Task 7: Интеграция в существующий Terminal

**Files:**
- Modify: `src/components/Terminal.tsx`

**Step 1: Перехват не-slash ввода в `mode=slash` и отправка в AgentConsole/useAgent.**
**Step 2: Отрисовка streaming сообщений агента в текущем терминальном окне.**
**Step 3: Подключение `AgentSettings` без поломки текущих slash/shell режимов.

### Task 8: Проверка, diff, commit

**Files:**
- Modify: `tests/terminal/commands.test.ts` (если потребуется)

**Step 1: Запустить тесты и линтер.**
Run: `npm test`
Run: `npm run lint`

**Step 2: Показать `git diff --stat` и ключевые фрагменты diff.**
**Step 3: Commit.**
Commit: `feat: add event-driven ai agent orchestration layer`

### Task 9: Handoff

**Files:**
- Create: `HANDOFF.md`

**Step 1: Зафиксировать сделанное/не сделанное/риски/ручную проверку.**
