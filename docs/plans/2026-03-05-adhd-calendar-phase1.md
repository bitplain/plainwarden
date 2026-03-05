# ADHD Calendar Phase 1 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Добавить в Calendar2 полноценный Phase 1 ADHD-поток: Inbox, Micro-steps и базовый Progress.

**Architecture:** Реализация server-first на Prisma + Next.js Route Handlers. Источник истины — PostgreSQL (InboxItem/Task/Subtask). UI встроен в существующий Linear-style Calendar2 через новую вкладку Inbox и детали задачи.

**Tech Stack:** Next.js App Router, Prisma, PostgreSQL, React 19, Vitest.

---

## Реализовано

- Prisma schema расширена новыми enum/model: `InboxItem`, `Task`, `Subtask`.
- Добавлена миграция `20260305160000_add_inbox_tasks_subtasks`.
- Добавлены серверные модули:
  - `src/lib/server/inbox-db.ts`
  - `src/lib/server/tasks-db.ts`
- Добавлены API routes:
  - `/api/inbox`
  - `/api/inbox/[id]/convert`
  - `/api/inbox/[id]/archive`
  - `/api/tasks`
  - `/api/tasks/[id]`
  - `/api/tasks/panic-reset`
  - `/api/tasks/[id]/subtasks`
  - `/api/subtasks/[id]`
  - `/api/stats/daily`
  - `/api/stats/weekly`
- Расширены доменные типы и validators для Inbox/Task/Subtask.
- В `api` клиент добавлены методы для новых endpoints.
- В Calendar2 добавлены:
  - вкладка `Inbox` как default,
  - `QuickCaptureDialog` (+ hotkey `Cmd/Ctrl+Shift+I`),
  - `InboxPanel`, `TaskDetailsPanel`, `ProgressSummaryCard`,
  - support Panic Reset, Convert, Subtasks, Progress.
- Добавлен набор тестов для validators, route handlers, progress/idempotency и UI smoke.

## Verification checklist

- `npm test`
- `docker compose build`
- `docker compose up -d`
- Проверка `http://localhost:${PROXY_PORT:-8080}/api/health`
