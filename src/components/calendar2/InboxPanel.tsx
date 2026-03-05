"use client";

import { useMemo, useState } from "react";
import type { InboxItem, StatsDaily, StatsWeekly, Subtask, Task } from "@/lib/types";
import type { InboxBuckets } from "./inbox-types";
import ProgressSummaryCard from "./ProgressSummaryCard";
import TaskDetailsPanel from "./TaskDetailsPanel";

interface InboxPanelProps {
  loading: boolean;
  error: string | null;
  anchorDateKey: string;
  inbox: InboxBuckets;
  tasks: Task[];
  subtasksByTaskId: Record<string, Subtask[]>;
  selectedTaskId: string | null;
  onSelectTask: (taskId: string | null) => void;
  onCreateQuickItem: (content: string) => Promise<void> | void;
  onConvert: (id: string, target: "task" | "event" | "note") => Promise<void> | void;
  onArchive: (id: string) => Promise<void> | void;
  onPanicReset: () => Promise<void> | void;
  onLoadSubtasks: (taskId: string) => Promise<unknown> | void;
  onUpdateTask: (taskId: string, updates: {
    title?: string;
    description?: string;
    status?: "todo" | "in_progress" | "blocked" | "done";
    progressMode?: "subtasks" | "manual";
    manualProgress?: number;
    dueDate?: string | null;
    isPriority?: boolean;
  }) => Promise<void> | void;
  onAddSubtask: (taskId: string, title: string) => Promise<void> | void;
  onSetSubtaskDone: (subtaskId: string, taskId: string, done: boolean) => Promise<void> | void;
  dailyStats: StatsDaily | null;
  weeklyStats: StatsWeekly | null;
  priorityTasksTodayCount: number;
}

function InboxCard({
  item,
  onConvert,
  onArchive,
}: {
  item: InboxItem;
  onConvert: (target: "task" | "event" | "note") => void;
  onArchive: () => void;
}) {
  return (
    <article className="rounded-[8px] border border-[var(--cal2-border)] bg-[var(--cal2-surface-2)] p-2.5">
      <p className="text-[12px] text-[var(--cal2-text-primary)]">{item.content}</p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        <button
          type="button"
          onClick={() => onConvert("task")}
          className="rounded-[6px] border border-[var(--cal2-border)] bg-[var(--cal2-surface-1)] px-2 py-1 text-[10px] text-[var(--cal2-text-secondary)] hover:text-[var(--cal2-text-primary)]"
        >
          Task
        </button>
        <button
          type="button"
          onClick={() => onConvert("event")}
          className="rounded-[6px] border border-[var(--cal2-border)] bg-[var(--cal2-surface-1)] px-2 py-1 text-[10px] text-[var(--cal2-text-secondary)] hover:text-[var(--cal2-text-primary)]"
        >
          Event
        </button>
        <button
          type="button"
          onClick={() => onConvert("note")}
          className="rounded-[6px] border border-[var(--cal2-border)] bg-[var(--cal2-surface-1)] px-2 py-1 text-[10px] text-[var(--cal2-text-secondary)] hover:text-[var(--cal2-text-primary)]"
        >
          Note
        </button>
        <button
          type="button"
          onClick={onArchive}
          className="rounded-[6px] border border-[var(--cal2-border)] bg-[var(--cal2-surface-1)] px-2 py-1 text-[10px] text-[var(--cal2-text-secondary)] hover:text-[var(--cal2-text-primary)]"
        >
          Archive
        </button>
      </div>
    </article>
  );
}

export default function InboxPanel({
  loading,
  error,
  anchorDateKey,
  inbox,
  tasks,
  subtasksByTaskId,
  selectedTaskId,
  onSelectTask,
  onCreateQuickItem,
  onConvert,
  onArchive,
  onPanicReset,
  onLoadSubtasks,
  onUpdateTask,
  onAddSubtask,
  onSetSubtaskDone,
  dailyStats,
  weeklyStats,
  priorityTasksTodayCount,
}: InboxPanelProps) {
  const [quickValue, setQuickValue] = useState("");
  const [listMode, setListMode] = useState<"new" | "processed" | "archived">("new");

  const selectedTask = useMemo(
    () => tasks.find((task) => task.id === selectedTaskId) ?? null,
    [tasks, selectedTaskId],
  );

  const items =
    listMode === "new"
      ? inbox.newItems
      : listMode === "processed"
        ? inbox.processedItems
        : inbox.archivedItems;

  return (
    <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 xl:grid-cols-[360px_1fr]">
      <section className="flex min-h-0 flex-col gap-3">
        <div className="rounded-[8px] border border-[var(--cal2-border)] bg-[var(--cal2-surface-2)] p-3">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-[13px] font-semibold text-[var(--cal2-text-primary)]">Today + Inbox</h3>
            <button
              type="button"
              onClick={() => {
                void onPanicReset();
              }}
              className="rounded-[6px] border border-[var(--cal2-border)] bg-[var(--cal2-surface-1)] px-2 py-1 text-[10px] text-[var(--cal2-text-secondary)] hover:text-[var(--cal2-text-primary)]"
            >
              Panic Reset
            </button>
          </div>

          <form
            className="flex gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              if (!quickValue.trim()) {
                return;
              }
              void onCreateQuickItem(quickValue.trim());
              setQuickValue("");
            }}
          >
            <input
              type="text"
              value={quickValue}
              onChange={(event) => setQuickValue(event.target.value)}
              placeholder="Быстрый захват (1 строка)"
              className="h-9 w-full rounded-[6px] border border-[var(--cal2-border)] bg-[var(--cal2-surface-1)] px-3 text-[12px] text-[var(--cal2-text-primary)] outline-none"
            />
            <button
              type="submit"
              className="h-9 rounded-[6px] border border-[rgba(94,106,210,0.45)] bg-[var(--cal2-accent-soft)] px-3 text-[12px] text-[var(--cal2-text-primary)]"
            >
              +
            </button>
          </form>

          <p className="mt-2 text-[10px] text-[var(--cal2-text-secondary)]">
            Дата: {anchorDateKey} • Приоритетных на день: {priorityTasksTodayCount}/3
          </p>
        </div>

        <ProgressSummaryCard daily={dailyStats} weekly={weeklyStats} />

        <div className="rounded-[8px] border border-[var(--cal2-border)] bg-[var(--cal2-surface-2)] p-3">
          <div className="mb-2 inline-flex rounded-[6px] border border-[var(--cal2-border)] bg-[var(--cal2-surface-1)] p-0.5">
            {(["new", "processed", "archived"] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setListMode(mode)}
                className={`rounded-[4px] px-2.5 py-1 text-[10px] uppercase tracking-[0.08em] ${
                  listMode === mode
                    ? "bg-[var(--cal2-accent-soft)] text-[var(--cal2-text-primary)]"
                    : "text-[var(--cal2-text-secondary)]"
                }`}
              >
                {mode}
              </button>
            ))}
          </div>

          <div className="max-h-[280px] space-y-2 overflow-y-auto pr-1">
            {items.length === 0 ? (
              <p className="rounded-[6px] border border-dashed border-[var(--cal2-border)] px-2 py-2 text-[11px] text-[var(--cal2-text-secondary)]">
                Пусто
              </p>
            ) : (
              items.map((item) => (
                <InboxCard
                  key={item.id}
                  item={item}
                  onConvert={(target) => {
                    void onConvert(item.id, target);
                  }}
                  onArchive={() => {
                    void onArchive(item.id);
                  }}
                />
              ))
            )}
          </div>
        </div>

        <div className="rounded-[8px] border border-[var(--cal2-border)] bg-[var(--cal2-surface-2)] p-3">
          <h3 className="mb-2 text-[12px] font-semibold text-[var(--cal2-text-primary)]">Задачи</h3>
          <div className="max-h-[240px] space-y-1.5 overflow-y-auto pr-1">
            {tasks.map((task) => (
              <button
                key={task.id}
                type="button"
                onClick={() => onSelectTask(task.id)}
                className={`flex w-full items-center justify-between rounded-[6px] border px-2.5 py-2 text-left ${
                  task.id === selectedTaskId
                    ? "border-[rgba(94,106,210,0.4)] bg-[var(--cal2-accent-soft)]"
                    : "border-[var(--cal2-border)] bg-[var(--cal2-surface-1)]"
                }`}
              >
                <div>
                  <p className="text-[12px] text-[var(--cal2-text-primary)]">{task.title}</p>
                  <p className="text-[10px] text-[var(--cal2-text-secondary)]">
                    {task.dueDate ?? "Без срока"} • {task.status}
                  </p>
                </div>
                <span className="text-[10px] text-[var(--cal2-text-secondary)]">{task.progressPercent}%</span>
              </button>
            ))}
          </div>
        </div>

        {(loading || error) && (
          <div className="rounded-[6px] border border-[var(--cal2-border)] bg-[var(--cal2-surface-2)] px-3 py-2 text-[11px] text-[var(--cal2-text-secondary)]">
            {loading ? "Загрузка..." : error}
          </div>
        )}
      </section>

      <div className="min-h-0">
        {selectedTask ? (
          <TaskDetailsPanel
            key={selectedTask.id}
            task={selectedTask}
            subtasks={subtasksByTaskId[selectedTask.id] ?? []}
            onLoadSubtasks={onLoadSubtasks}
            onUpdateTask={onUpdateTask}
            onAddSubtask={onAddSubtask}
            onSetSubtaskDone={(subtaskId, taskId, done) => {
              void onSetSubtaskDone(subtaskId, taskId, done);
            }}
          />
        ) : (
          <div className="flex h-full min-h-[320px] items-center justify-center rounded-[8px] border border-dashed border-[var(--cal2-border)] bg-[var(--cal2-surface-2)]">
            <p className="text-[12px] text-[var(--cal2-text-secondary)]">Выберите задачу для деталей</p>
          </div>
        )}
      </div>
    </div>
  );
}
