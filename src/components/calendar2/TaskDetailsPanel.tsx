"use client";

import { useEffect, useMemo, useState } from "react";
import type { Subtask, Task, TaskProgressMode, TaskStatus } from "@/lib/types";

interface TaskDetailsPanelProps {
  task: Task;
  subtasks: Subtask[];
  onLoadSubtasks: (taskId: string) => Promise<unknown> | void;
  onUpdateTask: (taskId: string, updates: {
    title?: string;
    description?: string;
    status?: TaskStatus;
    progressMode?: TaskProgressMode;
    manualProgress?: number;
    dueDate?: string | null;
    isPriority?: boolean;
  }) => Promise<void> | void;
  onAddSubtask: (taskId: string, title: string) => Promise<void> | void;
  onSetSubtaskDone: (subtaskId: string, taskId: string, done: boolean) => Promise<void> | void;
}

export default function TaskDetailsPanel({
  task,
  subtasks,
  onLoadSubtasks,
  onUpdateTask,
  onAddSubtask,
  onSetSubtaskDone,
}: TaskDetailsPanelProps) {
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description);
  const [subtaskInput, setSubtaskInput] = useState("");

  useEffect(() => {
    void onLoadSubtasks(task.id);
  }, [task.id, onLoadSubtasks]);

  const progressLabel = useMemo(() => {
    if (task.progressMode === "manual") {
      return `${task.manualProgress}%`;
    }
    return `${task.subtasksDone}/${task.subtasksTotal}`;
  }, [task.progressMode, task.manualProgress, task.subtasksDone, task.subtasksTotal]);

  return (
    <section className="flex min-h-0 flex-col rounded-[8px] border border-[var(--cal2-border)] bg-[var(--cal2-surface-2)] p-3">
      <div className="mb-3 flex items-start justify-between gap-3">
        <h3 className="text-[13px] font-semibold text-[var(--cal2-text-primary)]">Task Details</h3>
        <span className="rounded-[4px] border border-[var(--cal2-border)] bg-[rgba(255,255,255,0.03)] px-2 py-0.5 text-[10px] text-[var(--cal2-text-secondary)]">
          Прогресс: {progressLabel}
        </span>
      </div>

      <div className="space-y-2">
        <input
          type="text"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          className="h-9 w-full rounded-[6px] border border-[var(--cal2-border)] bg-[var(--cal2-surface-1)] px-3 text-[12px] text-[var(--cal2-text-primary)] outline-none focus:border-[rgba(94,106,210,0.42)]"
        />
        <textarea
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          className="min-h-20 w-full resize-none rounded-[6px] border border-[var(--cal2-border)] bg-[var(--cal2-surface-1)] px-3 py-2 text-[12px] text-[var(--cal2-text-primary)] outline-none focus:border-[rgba(94,106,210,0.42)]"
        />
        <button
          type="button"
          onClick={() => {
            void onUpdateTask(task.id, {
              title: title.trim() || task.title,
              description,
            });
          }}
          className="h-8 rounded-[6px] border border-[var(--cal2-border)] bg-[var(--cal2-surface-1)] px-3 text-[11px] text-[var(--cal2-text-secondary)] hover:text-[var(--cal2-text-primary)]"
        >
          Сохранить описание
        </button>
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <label className="space-y-1">
          <span className="text-[10px] uppercase tracking-[0.1em] text-[var(--cal2-text-secondary)]">Статус</span>
          <select
            value={task.status}
            onChange={(event) => {
              void onUpdateTask(task.id, { status: event.target.value as TaskStatus });
            }}
            className="h-8 w-full rounded-[6px] border border-[var(--cal2-border)] bg-[var(--cal2-surface-1)] px-2 text-[12px] text-[var(--cal2-text-primary)] outline-none"
          >
            <option value="todo">To do</option>
            <option value="in_progress">In progress</option>
            <option value="blocked">Blocked</option>
            <option value="done">Done</option>
          </select>
        </label>

        <label className="space-y-1">
          <span className="text-[10px] uppercase tracking-[0.1em] text-[var(--cal2-text-secondary)]">Режим прогресса</span>
          <select
            value={task.progressMode}
            onChange={(event) => {
              void onUpdateTask(task.id, { progressMode: event.target.value as TaskProgressMode });
            }}
            className="h-8 w-full rounded-[6px] border border-[var(--cal2-border)] bg-[var(--cal2-surface-1)] px-2 text-[12px] text-[var(--cal2-text-primary)] outline-none"
          >
            <option value="subtasks">Subtasks</option>
            <option value="manual">Manual</option>
          </select>
        </label>

        <label className="space-y-1">
          <span className="text-[10px] uppercase tracking-[0.1em] text-[var(--cal2-text-secondary)]">Срок</span>
          <input
            type="date"
            value={task.dueDate ?? ""}
            onChange={(event) => {
              const next = event.target.value;
              void onUpdateTask(task.id, { dueDate: next || null });
            }}
            className="h-8 w-full rounded-[6px] border border-[var(--cal2-border)] bg-[var(--cal2-surface-1)] px-2 text-[12px] text-[var(--cal2-text-primary)] outline-none"
          />
        </label>

        <label className="flex items-center gap-2 pt-5 text-[12px] text-[var(--cal2-text-primary)]">
          <input
            type="checkbox"
            checked={task.isPriority}
            onChange={(event) => {
              void onUpdateTask(task.id, { isPriority: event.target.checked });
            }}
            className="h-4 w-4 rounded border border-[var(--cal2-border)] bg-[var(--cal2-surface-1)]"
          />
          Приоритетная задача
        </label>
      </div>

      {task.progressMode === "manual" && (
        <div className="mt-2">
          <label className="space-y-1">
            <span className="text-[10px] uppercase tracking-[0.1em] text-[var(--cal2-text-secondary)]">Ручной прогресс %</span>
            <input
              type="number"
              min={0}
              max={100}
              value={task.manualProgress}
              onChange={(event) => {
                const raw = Number(event.target.value);
                const value = Number.isFinite(raw) ? Math.max(0, Math.min(100, raw)) : 0;
                void onUpdateTask(task.id, { manualProgress: value });
              }}
              className="h-8 w-full rounded-[6px] border border-[var(--cal2-border)] bg-[var(--cal2-surface-1)] px-2 text-[12px] text-[var(--cal2-text-primary)] outline-none"
            />
          </label>
        </div>
      )}

      <div className="mt-4 min-h-0 flex-1 rounded-[8px] border border-[var(--cal2-border)] bg-[var(--cal2-surface-1)] p-2">
        <div className="mb-2 flex items-center justify-between">
          <h4 className="text-[12px] font-semibold text-[var(--cal2-text-primary)]">Micro-steps</h4>
          <span className="text-[10px] text-[var(--cal2-text-secondary)]">≤ 15 минут</span>
        </div>

        <div className="mb-2 flex gap-2">
          <input
            type="text"
            value={subtaskInput}
            onChange={(event) => setSubtaskInput(event.target.value)}
            placeholder="Добавить шаг"
            className="h-8 w-full rounded-[6px] border border-[var(--cal2-border)] bg-[var(--cal2-surface-2)] px-2 text-[12px] text-[var(--cal2-text-primary)] outline-none"
          />
          <button
            type="button"
            onClick={() => {
              if (!subtaskInput.trim()) {
                return;
              }
              void onAddSubtask(task.id, subtaskInput.trim());
              setSubtaskInput("");
            }}
            className="h-8 rounded-[6px] border border-[var(--cal2-border)] bg-[var(--cal2-surface-2)] px-3 text-[11px] text-[var(--cal2-text-secondary)] hover:text-[var(--cal2-text-primary)]"
          >
            +
          </button>
        </div>

        <div className="space-y-1.5">
          {subtasks.length === 0 ? (
            <p className="rounded-[6px] border border-dashed border-[var(--cal2-border)] px-2 py-2 text-[11px] text-[var(--cal2-text-secondary)]">
              Пока нет шагов.
            </p>
          ) : (
            subtasks.map((subtask) => (
              <label
                key={subtask.id}
                className="flex items-center gap-2 rounded-[6px] border border-[var(--cal2-border)] bg-[var(--cal2-surface-2)] px-2 py-1.5 text-[12px] text-[var(--cal2-text-primary)]"
              >
                <input
                  type="checkbox"
                  checked={subtask.status === "done"}
                  onChange={(event) => {
                    void onSetSubtaskDone(subtask.id, task.id, event.target.checked);
                  }}
                  className="h-4 w-4"
                />
                <span className={subtask.status === "done" ? "line-through text-[var(--cal2-text-secondary)]" : ""}>
                  {subtask.title}
                </span>
              </label>
            ))
          )}
        </div>
      </div>
    </section>
  );
}
