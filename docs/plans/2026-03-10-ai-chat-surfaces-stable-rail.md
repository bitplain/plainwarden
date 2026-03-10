# AI Chat Surfaces Stable Rail Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Устранить визуальное схлопывание AI-поверхностей: закрепить стабильную центральную колонку во встроенной панели календаря и сделать правый AI-виджет заметно компактнее после первого сообщения.

**Architecture:** Общий `AiChatPanel` остаётся единым источником разметки, но получает stage-aware layout через вычисляемые ограничения и условные классы без изменения внешнего API. `AiChatWidget` управляет только поведением floating-shell по состояниям `empty` и `active`, а layout-токены и компактные размеры фиксируются в `ai-chat/constants`.

**Tech Stack:** Next.js 16, React 19, Tailwind CSS v4, Motion for React, Vitest.

---

### Task 1: Зафиксировать layout-токены и покрыть их тестами

**Files:**
- Modify: `src/components/ai-chat/constants.ts`
- Test: `tests/ai-chat-panel.test.ts`

**Step 1: Write the failing tests**

- Добавить тесты на вычисление stage-aware layout для `embedded` и `floating`.
- Проверить, что `embedded` всегда возвращает стабильный central rail, а `floating` в active-state использует более компактную высоту и плотные chips.

**Step 2: Run test to verify it fails**

Run: `npx vitest run tests/ai-chat-panel.test.ts`
Expected: FAIL из-за отсутствующих layout helper / stage tokens.

**Step 3: Write minimal implementation**

- Добавить helper для вычисления AI surface layout по `mode`, `hasMessages`, `hasPendingAction`.
- Вынести константы для central rail, compact widget height, размеров chips/badges/composer.

**Step 4: Run test to verify it passes**

Run: `npx vitest run tests/ai-chat-panel.test.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add tests/ai-chat-panel.test.ts src/components/ai-chat/constants.ts docs/plans/2026-03-10-ai-chat-surfaces-stable-rail.md
git commit -m "refactor: add ai surface layout tokens"
```

### Task 2: Перестроить `AiChatPanel` под стабильную колонку и компактный composer

**Files:**
- Modify: `src/components/ai-chat/AiChatPanel.tsx`
- Test: `tests/ai-chat-panel.test.ts`

**Step 1: Write the failing tests**

- Добавить статический рендер-тест, который проверяет central rail в `embedded` и compact header/composer классы в active floating-state.

**Step 2: Run test to verify it fails**

Run: `npx vitest run tests/ai-chat-panel.test.ts`
Expected: FAIL по отсутствующим классам/атрибутам.

**Step 3: Write minimal implementation**

- Ввести один conversation rail для `embedded`.
- Уплотнить service-row, chips, badge и composer с сохранением общего dark-shell.
- Сохранить мягкие layout transitions через `motion` без смены внешнего API.

**Step 4: Run test to verify it passes**

Run: `npx vitest run tests/ai-chat-panel.test.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add tests/ai-chat-panel.test.ts src/components/ai-chat/AiChatPanel.tsx
git commit -m "refactor: stabilize ai chat panel layout"
```

### Task 3: Сделать active-state правого виджета компактным

**Files:**
- Modify: `src/components/AiChatWidget.tsx`
- Test: `tests/ai-chat-panel.test.ts`

**Step 1: Write the failing tests**

- Добавить тест на stage-aware floating shell: empty-state остаётся промо-ориентированным, active-state уменьшает высоту и вертикальный chrome.

**Step 2: Run test to verify it fails**

Run: `npx vitest run tests/ai-chat-panel.test.ts`
Expected: FAIL по отсутствию compact active classes.

**Step 3: Write minimal implementation**

- Вычислять shell-классы виджета по состоянию `messages.length` / `pendingAction`.
- Сохранить стабильную desktop-width и уменьшить active-height/vertical spacing.

**Step 4: Run test to verify it passes**

Run: `npx vitest run tests/ai-chat-panel.test.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add tests/ai-chat-panel.test.ts src/components/AiChatWidget.tsx
git commit -m "refactor: compact ai widget active state"
```

### Task 4: Прогнать полную верификацию и Docker smoke

**Files:**
- Modify: none

**Step 1: Run focused tests**

Run: `npx vitest run tests/ai-chat-panel.test.ts tests/ai-chat-theme.test.ts`
Expected: PASS.

**Step 2: Run full test suite**

Run: `npm test`
Expected: PASS.

**Step 3: Run production build**

Run: `npm run build`
Expected: PASS.

**Step 4: Run Docker verification**

Run: `docker compose build`
Expected: PASS.

Run: `docker compose up -d`
Expected: containers are healthy / running.

**Step 5: Manual smoke**

- Открыть `/calendar`.
- Проверить empty/active states встроенной AI-панели и правого виджета.

**Step 6: Commit**

```bash
git add -A
git commit -m "refactor: tighten ai chat surfaces"
```
