# Agent Push Reminders Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Реализовать production-ready push-уведомления и проактивные напоминания в консоли для AI-агента.

**Architecture:** Добавляется reminder engine (calendar/kanban due + overdue), хранилище push-подписок, cron endpoint генерации и доставки уведомлений, а также клиентский service worker для web push. В консоль добавляется фоновой polling непрочитанных напоминаний и отображение в терминальном потоке.

**Tech Stack:** Next.js App Router, Prisma/PostgreSQL, web-push (VAPID), Service Worker, React hooks, Vitest.

---

### Task 1: RED-тесты reminder engine

**Files:**
- Create: `tests/agent/reminder-engine.test.ts`
- Create: `tests/agent/reminder-anti-spam.test.ts`

**Step 1: Написать failing tests на классификацию дедлайнов (`due_today`, `due_tomorrow`, `overdue`).**
**Step 2: Написать failing tests на дедуп ключи и anti-spam лимит.**
**Step 3: Проверить падение.**
Run: `npm test -- tests/agent/reminder-engine.test.ts tests/agent/reminder-anti-spam.test.ts`
Expected: FAIL (модули не существуют).

### Task 2: Prisma модели подписок и напоминаний

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/20260228143000_add_push_reminders/migration.sql`

**Step 1: Добавить `PushSubscription` и `AgentReminder` модели + enum для вида напоминаний.**
**Step 2: Добавить индексы и unique constraints для дедупа.**
**Step 3: Сгенерировать клиент Prisma.**
Run: `npm run db:generate`

### Task 3: Серверная логика push/reminders

**Files:**
- Create: `src/lib/server/push-subscriptions-db.ts`
- Create: `src/lib/server/push-delivery.ts`
- Create: `src/lib/server/reminder-engine.ts`
- Create: `src/lib/server/reminder-db.ts`

**Step 1: Реализовать CRUD подписок + soft disable.**
**Step 2: Реализовать `web-push` отправку и обработку 404/410 (деактивация подписки).**
**Step 3: Реализовать генерацию reminder-кандидатов и дедуп по ключу.**
**Step 4: Реализовать anti-spam policy (лимит push на пользователя/час).**

### Task 4: API endpoints

**Files:**
- Create: `src/app/api/push/subscribe/route.ts`
- Create: `src/app/api/push/unsubscribe/route.ts`
- Create: `src/app/api/push/test/route.ts`
- Create: `src/app/api/agent/reminders/route.ts`
- Create: `src/app/api/agent/reminders/[id]/read/route.ts`
- Create: `src/app/api/cron/reminders/route.ts`

**Step 1: Реализовать auth-protected endpoints subscribe/unsubscribe/list/read.**
**Step 2: Реализовать cron endpoint генерации/рассылки с секретом.**
**Step 3: Реализовать тестовый push endpoint.**

### Task 5: Клиентская интеграция

**Files:**
- Create: `public/sw.js`
- Create: `src/hooks/usePushNotifications.ts`
- Modify: `src/components/Terminal.tsx`

**Step 1: Добавить регистрацию service worker и подписку PushManager.**
**Step 2: Добавить polling `/api/agent/reminders` и вывод уведомлений в консоли.**
**Step 3: Добавить mark-as-read после отображения/действия пользователя.**

### Task 6: GREEN-проверки

**Files:**
- Modify: `tests/agent/reminder-engine.test.ts`
- Modify: `tests/agent/reminder-anti-spam.test.ts`

**Step 1: Прогнать targeted tests.**
Run: `npm test -- tests/agent/reminder-engine.test.ts tests/agent/reminder-anti-spam.test.ts`

**Step 2: Прогнать полный набор.**
Run: `npm test`
Run: `npm run lint`
Run: `npm run build`

### Task 7: Diff, commit, PR

**Files:**
- Modify: `HANDOFF.md`

**Step 1: Показать `git diff --stat` и ключевые части `git diff`.**
**Step 2: Commit.**
Commit: `feat: add push notifications and proactive reminder engine`

**Step 3: Push и новый PR в `main` (follow-up к #52).**
