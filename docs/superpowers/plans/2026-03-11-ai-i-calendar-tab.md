# AI-I Calendar Tab Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Добавить вкладку `AI-I` в `/calendar`, сохранив объединённый `Inbox + AI` на `/` и не возвращая legacy вкладки в календарь.

**Architecture:** `/` остаётся home workspace, а `/calendar` получает только новую experimental-вкладку `AI-I`. Реестр AI-surfaces разделяет календарные поверхности и floating/widget surface, чтобы `AI-I` попал в тулбар календаря, а legacy `AI` остался домашней и widget-поверхностью.

**Tech Stack:** Next.js App Router, React 19, Zustand, Vitest, Docker Compose

---

## Chunk 1: Зафиксировать поведение тестами

### Task 1: Обновить тесты тулбара и URL-state

**Files:**
- Modify: `tests/calendar2-toolbar-tabs.test.ts`
- Modify: `tests/calendar2/calendar2-url-state.test.ts`
- Modify: `tests/ai-chat-surfaces.test.ts`

- [ ] **Step 1: Написать падающие проверки для нового контракта**
- [ ] **Step 2: Запустить целевые тесты и убедиться, что они падают по ожидаемой причине**

Run: `npm test -- tests/calendar2-toolbar-tabs.test.ts tests/calendar2/calendar2-url-state.test.ts tests/ai-chat-surfaces.test.ts`

Expected: падение на текущем diff, потому что `inbox/ai` всё ещё считаются календарными табами, а registry показывает legacy `AI` как toolbar-tab.

## Chunk 2: Минимально скорректировать runtime и тулбар

### Task 2: Оставить в календаре только `AI-I`

**Files:**
- Modify: `src/components/calendar2/calendar2-types.ts`
- Modify: `src/components/calendar2/calendar2-url-state.ts`
- Modify: `src/components/calendar2/Calendar2.tsx`
- Modify: `src/components/calendar2/Calendar2Toolbar.tsx`
- Modify: `src/components/ai-chat/surfaces.ts`

- [ ] **Step 1: Удалить legacy `inbox/ai` из календарных tab-type и parse logic**
- [ ] **Step 2: Оставить `AI-I` единственной AI-вкладкой календаря**
- [ ] **Step 3: Сохранить ссылку `AI` на `/` в тулбаре календаря**
- [ ] **Step 4: Запустить целевые тесты и убедиться, что они проходят**

Run: `npm test -- tests/calendar2-toolbar-tabs.test.ts tests/calendar2/calendar2-url-state.test.ts tests/ai-chat-surfaces.test.ts`

Expected: PASS

## Chunk 3: Проверить полный AI-I diff

### Task 3: Прогнать связанный набор тестов и Docker

**Files:**
- Verify: `src/app/layout.tsx`
- Verify: `src/components/AiChatWidget.tsx`
- Verify: `src/components/ai-chat/AiChatProvider.tsx`
- Verify: `src/components/ai-chat/AiIChatSurface.tsx`
- Verify: `src/components/ai-chat/runtime-store.ts`
- Verify: `src/components/calendar2/Calendar2AiIPanel.tsx`
- Verify: `tests/ai-chat-runtime-store.test.ts`
- Verify: `tests/ai-i-chat-surface.test.ts`

- [ ] **Step 1: Прогнать связанный тестовый набор**
- [ ] **Step 2: Посмотреть `git diff --stat` и ключевые куски diff**
- [ ] **Step 3: Выполнить `docker compose build`**
- [ ] **Step 4: Выполнить `docker compose up -d`**
- [ ] **Step 5: Проверить сайт вручную**
- [ ] **Step 6: Сделать commit / push / PR**

Run: `npm test -- tests/ai-chat-runtime-store.test.ts tests/ai-chat-surfaces.test.ts tests/ai-i-chat-surface.test.ts tests/calendar2-toolbar-tabs.test.ts tests/calendar2/calendar2-url-state.test.ts tests/app-home-workspace-routes.test.ts`

Expected: PASS
