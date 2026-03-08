import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import InboxPanel from "@/components/calendar2/InboxPanel";
import type { InboxItem, Task } from "@/lib/types";

const NEW_ITEM: InboxItem = {
  id: "inbox-1",
  userId: "user-1",
  content: "Записать мысль про новый ритуал утра",
  typeHint: "idea",
  status: "new",
  createdAt: "2026-03-08T08:00:00.000Z",
  updatedAt: "2026-03-08T08:00:00.000Z",
};

const TASKS: Task[] = [
  {
    id: "task-1",
    userId: "user-1",
    title: "Разобрать inbox",
    description: "",
    status: "in_progress",
    progressMode: "subtasks",
    manualProgress: 0,
    dueDate: "2026-03-08",
    isPriority: true,
    createdAt: "2026-03-08T07:00:00.000Z",
    updatedAt: "2026-03-08T07:00:00.000Z",
    progressPercent: 40,
    subtasksTotal: 5,
    subtasksDone: 2,
  },
];

function renderPanel(input: { items?: InboxItem[] } = {}) {
  return renderToStaticMarkup(
    React.createElement(InboxPanel, {
      loading: false,
      error: null,
      anchorDateKey: "2026-03-08",
      inbox: {
        newItems: input.items ?? [NEW_ITEM],
        processedItems: [],
        archivedItems: [],
      },
      tasks: TASKS,
      onCreateQuickItem: () => undefined,
      onConvert: () => undefined,
      onArchive: () => undefined,
      onPanicReset: () => undefined,
      subtasksByTaskId: {},
      selectedTaskId: null,
      onSelectTask: () => undefined,
      onLoadSubtasks: () => undefined,
      onUpdateTask: () => undefined,
      onAddSubtask: () => undefined,
      onSetSubtaskDone: () => undefined,
      dailyStats: null,
      weeklyStats: null,
      priorityTasksTodayCount: 1,
    }),
  );
}

describe("InboxPanel redesign", () => {
  it("renders dominant quick capture copy and primary inline actions", () => {
    const html = renderPanel();

    expect(html).toContain("Quick Capture");
    expect(html).toContain("Нажмите /, чтобы вернуть фокус");
    expect(html).toContain("aria-label=\"Quick Capture\"");
    expect(html).toContain("В задачу");
    expect(html).toContain("В календарь");
    expect(html).not.toContain(">Task<");
    expect(html).not.toContain(">Event<");
    expect(html).not.toContain(">Note<");
    expect(html).not.toContain(">Archive<");
  });

  it("renders a guided empty state instead of a bare empty label", () => {
    const html = renderPanel({ items: [] });

    expect(html).toContain("Пустой Inbox - это нормально");
    expect(html).toContain("Начните с одной строки");
    expect(html).not.toContain(">Пусто<");
  });
});
