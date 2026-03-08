"use client";

import { AnimatePresence, motion } from "motion/react";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type MutableRefObject,
  type ReactNode,
} from "react";
import type {
  ConvertInboxItemInput,
  InboxAiAnalysis,
  InboxAiRecommendedTarget,
  InboxItem,
  StatsDaily,
  StatsWeekly,
  Subtask,
  Task,
} from "@/lib/types";
import type { InboxBuckets } from "./inbox-types";
import ProgressSummaryCard from "./ProgressSummaryCard";
import TaskDetailsPanel from "./TaskDetailsPanel";
import {
  buildInboxAiPrefillForTarget,
  getInboxItemActionState,
  type PendingInboxAction,
} from "./inbox-ui";
import { INBOX_LIST_SCROLL_CLASSNAME } from "./mobile-layout";

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
  onConvert: (
    id: string,
    target: "task" | "event" | "note",
    options?: Omit<ConvertInboxItemInput, "target">,
  ) => Promise<void> | void;
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
  captureInputRef?: MutableRefObject<HTMLInputElement | null>;
  analysisByItemId: Record<string, InboxAiAnalysis>;
  analysisErrorByItemId: Record<string, string>;
  analysisLoadingItemId: string | null;
  onAnalyzeItem: (itemId: string) => Promise<unknown> | void;
}

const LIST_MODE_META = {
  new: {
    label: "Новые",
    tone: "bg-[rgba(94,106,210,0.18)] text-[#dfe3ff]",
    emptyTitle: "Пустой Inbox - это нормально",
    emptyDescription:
      "Начните с одной строки. Всё останется здесь, пока вы сами не решите, что делать дальше.",
  },
  processed: {
    label: "Обработанные",
    tone: "bg-[rgba(74,222,128,0.12)] text-[#b4f4c9]",
    emptyTitle: "Пока ничего не обработано вручную",
    emptyDescription: "Когда вы конвертируете item, он останется в Inbox и просто сменит статус.",
  },
  archived: {
    label: "Архив",
    tone: "bg-[rgba(255,255,255,0.08)] text-[var(--cal2-text-primary)]",
    emptyTitle: "Архив пока пуст",
    emptyDescription: "Архивируйте только то, что уже не должно оставаться в активном поле внимания.",
  },
} satisfies Record<
  "new" | "processed" | "archived",
  {
    label: string;
    tone: string;
    emptyTitle: string;
    emptyDescription: string;
  }
>;

const TYPE_HINT_LABELS: Record<InboxItem["typeHint"], string> = {
  idea: "Идея",
  task: "Задача",
  note: "Заметка",
  link: "Ссылка",
};

const CONVERTED_TYPE_LABELS: Record<NonNullable<InboxItem["convertedToEntityType"]>, string> = {
  task: "задачей",
  event: "событием",
  note: "заметкой",
};

const AI_TARGET_LABELS: Record<InboxAiRecommendedTarget, string> = {
  task: "В задачу",
  event: "В календарь",
  note: "В заметку",
  keep: "Оставить в Inbox",
};

function formatInboxTimestamp(value?: string): string {
  if (!value) {
    return "Только что";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Недавно";
  }

  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function SurfaceCard({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-[10px] border border-[var(--cal2-border)] bg-[var(--cal2-surface-2)] ${className}`.trim()}
    >
      {children}
    </section>
  );
}

function EmptyInboxState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-[10px] border border-dashed border-[var(--cal2-border)] bg-[rgba(255,255,255,0.02)] px-4 py-5">
      <h4 className="text-[13px] font-semibold text-[var(--cal2-text-primary)]">{title}</h4>
      <p className="mt-1.5 max-w-[42ch] text-[12px] leading-[1.5] text-[var(--cal2-text-secondary)]">
        {description}
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <span className="rounded-full border border-[var(--cal2-border)] px-2.5 py-1 text-[11px] text-[var(--cal2-text-secondary)]">
          Позвонить врачу
        </span>
        <span className="rounded-full border border-[var(--cal2-border)] px-2.5 py-1 text-[11px] text-[var(--cal2-text-secondary)]">
          Идея для заметки
        </span>
      </div>
    </div>
  );
}

function InboxCard({
  item,
  isSelected,
  pendingAction,
  aiAnalysis,
  onSelect,
  onConvertTask,
  onConvertEvent,
}: {
  item: InboxItem;
  isSelected: boolean;
  pendingAction: PendingInboxAction | null;
  aiAnalysis?: InboxAiAnalysis | null;
  onSelect: () => void;
  onConvertTask: () => void;
  onConvertEvent: () => void;
}) {
  const actionState = getInboxItemActionState(item, pendingAction);
  const isTaskRecommended = aiAnalysis?.recommendedTarget === "task";
  const isEventRecommended = aiAnalysis?.recommendedTarget === "event";

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18, ease: "easeOut" }}
      className={`rounded-[10px] border p-3 text-left transition-colors ${
        isSelected
          ? "border-[rgba(94,106,210,0.42)] bg-[rgba(94,106,210,0.12)]"
          : "border-[var(--cal2-border)] bg-[var(--cal2-surface-2)] hover:border-[rgba(94,106,210,0.22)]"
      }`}
    >
      <button type="button" onClick={onSelect} className="block w-full text-left">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
              <span className="rounded-full border border-[var(--cal2-border)] px-2 py-0.5 text-[10px] uppercase tracking-[0.12em] text-[var(--cal2-text-secondary)]">
                {TYPE_HINT_LABELS[item.typeHint]}
              </span>
              <span className="rounded-full border border-transparent bg-[rgba(255,255,255,0.06)] px-2 py-0.5 text-[10px] text-[var(--cal2-text-primary)]">
                {getInboxItemActionState(item).statusLabel}
              </span>
            </div>
            <p className="text-[13px] leading-[1.45] text-[var(--cal2-text-primary)]">{item.content}</p>
          </div>
          <span className="shrink-0 text-[10px] text-[var(--cal2-text-secondary)]">
            {formatInboxTimestamp(item.processedAt ?? item.createdAt)}
          </span>
        </div>
      </button>

      {item.convertedToEntityType && (
        <p className="mt-2 text-[11px] text-[var(--cal2-text-secondary)]">
          Уже связано с {CONVERTED_TYPE_LABELS[item.convertedToEntityType]}.
        </p>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={!actionState.canConvertToTask}
          onClick={(event) => {
            event.stopPropagation();
            void onConvertTask();
          }}
          className={`rounded-[7px] border px-2.5 py-1.5 text-[11px] font-medium text-[var(--cal2-text-primary)] disabled:cursor-not-allowed disabled:opacity-50 ${
            isTaskRecommended
              ? "border-[rgba(94,106,210,0.64)] bg-[rgba(94,106,210,0.22)] shadow-[0_0_0_1px_rgba(94,106,210,0.22)]"
              : "border-[rgba(94,106,210,0.42)] bg-[var(--cal2-accent-soft)]"
          }`}
        >
          {actionState.isPending ? "Сохраняю..." : "В задачу"}
        </button>
        <button
          type="button"
          disabled={!actionState.canConvertToEvent}
          onClick={(event) => {
            event.stopPropagation();
            void onConvertEvent();
          }}
          className={`rounded-[7px] border px-2.5 py-1.5 text-[11px] font-medium text-[var(--cal2-text-primary)] disabled:cursor-not-allowed disabled:opacity-50 ${
            isEventRecommended
              ? "border-[rgba(94,106,210,0.64)] bg-[rgba(94,106,210,0.18)]"
              : "border-[var(--cal2-border)] bg-[var(--cal2-surface-1)]"
          }`}
        >
          В календарь
        </button>
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onSelect();
          }}
          className="rounded-[7px] border border-[var(--cal2-border)] bg-transparent px-2.5 py-1.5 text-[11px] text-[var(--cal2-text-secondary)] hover:text-[var(--cal2-text-primary)]"
        >
          Ещё
        </button>
      </div>
    </motion.article>
  );
}

function ContextRail({
  selectedItem,
  pendingAction,
  tasks,
  selectedTask,
  subtasks,
  onSelectTask,
  onLoadSubtasks,
  onUpdateTask,
  onAddSubtask,
  onSetSubtaskDone,
  onConvertNote,
  onArchive,
  aiAnalysis,
  aiAnalysisError,
  isAiAnalyzing,
  onAnalyze,
  dailyStats,
  weeklyStats,
}: {
  selectedItem: InboxItem | null;
  pendingAction: PendingInboxAction | null;
  tasks: Task[];
  selectedTask: Task | null;
  subtasks: Subtask[];
  onSelectTask: (taskId: string | null) => void;
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
  onConvertNote: (itemId: string) => Promise<void>;
  onArchive: (itemId: string) => Promise<void>;
  aiAnalysis?: InboxAiAnalysis | null;
  aiAnalysisError?: string;
  isAiAnalyzing: boolean;
  onAnalyze: (itemId: string) => Promise<unknown> | void;
  dailyStats: StatsDaily | null;
  weeklyStats: StatsWeekly | null;
}) {
  const actionState = selectedItem ? getInboxItemActionState(selectedItem, pendingAction) : null;
  const spotlightTasks = tasks;
  const isNoteRecommended = aiAnalysis?.recommendedTarget === "note";
  const requestAiAnalysis = (itemId: string) => {
    void Promise.resolve(onAnalyze(itemId)).catch(() => undefined);
  };

  return (
    <aside className="flex min-h-0 flex-col gap-3">
      <ProgressSummaryCard daily={dailyStats} weekly={weeklyStats} />

      <SurfaceCard className="min-h-[260px] p-4">
        <AnimatePresence mode="wait">
          {selectedItem ? (
            <motion.div
              key={selectedItem.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
              className="space-y-4"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-[var(--cal2-border)] px-2 py-0.5 text-[10px] uppercase tracking-[0.12em] text-[var(--cal2-text-secondary)]">
                  Контекст
                </span>
                <span className="rounded-full bg-[rgba(255,255,255,0.06)] px-2 py-0.5 text-[10px] text-[var(--cal2-text-primary)]">
                  {actionState?.statusLabel}
                </span>
              </div>

              <div>
                <p className="text-[12px] text-[var(--cal2-text-secondary)]">
                  {TYPE_HINT_LABELS[selectedItem.typeHint]} • {formatInboxTimestamp(selectedItem.updatedAt)}
                </p>
                <h3 className="mt-2 text-[16px] font-semibold leading-[1.35] text-[var(--cal2-text-primary)]">
                  {selectedItem.content}
                </h3>
              </div>

              <div className="rounded-[10px] border border-[var(--cal2-border)] bg-[var(--cal2-surface-1)] p-3">
                <h4 className="text-[11px] uppercase tracking-[0.12em] text-[var(--cal2-text-secondary)]">
                  Что дальше
                </h4>
                <p className="mt-2 text-[12px] leading-[1.5] text-[var(--cal2-text-primary)]">
                  {selectedItem.status === "new"
                    ? "Сначала быстрый захват, потом ручная обработка. Item не исчезнет из Inbox сам."
                    : "Item уже обработан вручную и остаётся в Inbox как история принятого решения."}
                </p>
                {selectedItem.convertedToEntityType && (
                  <p className="mt-2 text-[11px] text-[var(--cal2-text-secondary)]">
                    Конвертация уже выполнена: связано с {CONVERTED_TYPE_LABELS[selectedItem.convertedToEntityType]}.
                  </p>
                )}
              </div>

              {selectedItem.status === "new" && (
                <div className="rounded-[10px] border border-[var(--cal2-border)] bg-[var(--cal2-surface-1)] p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h4 className="text-[11px] uppercase tracking-[0.12em] text-[var(--cal2-text-secondary)]">
                        AI-разбор
                      </h4>
                      <p className="mt-1 text-[12px] leading-[1.5] text-[var(--cal2-text-secondary)]">
                        AI поможет предложить следующий шаг, но ничего не применит автоматически.
                      </p>
                    </div>
                    {!aiAnalysis && !isAiAnalyzing && !aiAnalysisError && (
                      <button
                        type="button"
                        onClick={() => {
                          requestAiAnalysis(selectedItem.id);
                        }}
                        className="rounded-[7px] border border-[rgba(94,106,210,0.42)] bg-[rgba(94,106,210,0.12)] px-3 py-1.5 text-[11px] font-medium text-[var(--cal2-text-primary)]"
                      >
                        AI-разобрать
                      </button>
                    )}
                  </div>

                  {isAiAnalyzing && (
                    <p className="mt-3 text-[12px] leading-[1.5] text-[var(--cal2-text-primary)]">
                      AI анализирует item и подбирает следующий шаг.
                    </p>
                  )}

                  {!isAiAnalyzing && aiAnalysisError && (
                    <div className="mt-3 space-y-3">
                      <p className="text-[12px] leading-[1.5] text-[var(--cal2-text-primary)]">
                        {aiAnalysisError}
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          requestAiAnalysis(selectedItem.id);
                        }}
                        className="rounded-[7px] border border-[var(--cal2-border)] bg-transparent px-3 py-1.5 text-[11px] text-[var(--cal2-text-secondary)] hover:text-[var(--cal2-text-primary)]"
                      >
                        Повторить
                      </button>
                    </div>
                  )}

                  {!isAiAnalyzing && aiAnalysis && (
                    <div className="mt-3 space-y-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full border border-[rgba(94,106,210,0.38)] bg-[rgba(94,106,210,0.12)] px-2.5 py-1 text-[10px] uppercase tracking-[0.12em] text-[#dfe3ff]">
                          Рекомендовано
                        </span>
                        <span className="rounded-full border border-[var(--cal2-border)] px-2.5 py-1 text-[11px] text-[var(--cal2-text-primary)]">
                          {AI_TARGET_LABELS[aiAnalysis.recommendedTarget]}
                        </span>
                      </div>

                      <p className="text-[13px] leading-[1.5] text-[var(--cal2-text-primary)]">
                        {aiAnalysis.summary}
                      </p>

                      {aiAnalysis.rationale.length > 0 && (
                        <div className="space-y-1">
                          {aiAnalysis.rationale.map((reason) => (
                            <p
                              key={reason}
                              className="text-[11px] leading-[1.5] text-[var(--cal2-text-secondary)]"
                            >
                              • {reason}
                            </p>
                          ))}
                        </div>
                      )}

                      <div className="flex flex-wrap gap-2">
                        {aiAnalysis.suggestedDate && (
                          <span className="rounded-full border border-[var(--cal2-border)] px-2.5 py-1 text-[11px] text-[var(--cal2-text-secondary)]">
                            Дата: {aiAnalysis.suggestedDate}
                          </span>
                        )}
                        {aiAnalysis.suggestedDueDate && (
                          <span className="rounded-full border border-[var(--cal2-border)] px-2.5 py-1 text-[11px] text-[var(--cal2-text-secondary)]">
                            Дедлайн: {aiAnalysis.suggestedDueDate}
                          </span>
                        )}
                        {aiAnalysis.suggestedPriority !== undefined && (
                          <span className="rounded-full border border-[var(--cal2-border)] px-2.5 py-1 text-[11px] text-[var(--cal2-text-secondary)]">
                            {aiAnalysis.suggestedPriority ? "Приоритетно" : "Без приоритета"}
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div>
                <p className="mb-2 text-[11px] uppercase tracking-[0.12em] text-[var(--cal2-text-secondary)]">
                  Дополнительные действия
                </p>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={!actionState?.canConvertToNote}
                    onClick={() => {
                      if (!selectedItem) {
                        return;
                      }
                      void onConvertNote(selectedItem.id);
                    }}
                    className={`rounded-[7px] border px-3 py-1.5 text-[11px] font-medium text-[var(--cal2-text-primary)] disabled:cursor-not-allowed disabled:opacity-50 ${
                      isNoteRecommended
                        ? "border-[rgba(94,106,210,0.64)] bg-[rgba(94,106,210,0.18)]"
                        : "border-[var(--cal2-border)] bg-[var(--cal2-surface-1)]"
                    }`}
                  >
                    {actionState?.isPending ? "Сохраняю..." : "В заметку"}
                  </button>
                  <button
                    type="button"
                    disabled={!actionState?.canArchive}
                    onClick={() => {
                      if (!selectedItem) {
                        return;
                      }
                      void onArchive(selectedItem.id);
                    }}
                    className="rounded-[7px] border border-[var(--cal2-border)] bg-transparent px-3 py-1.5 text-[11px] text-[var(--cal2-text-secondary)] hover:text-[var(--cal2-text-primary)] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Архивировать
                  </button>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="empty-rail"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
              className="space-y-4"
            >
              <div>
                <p className="text-[11px] uppercase tracking-[0.12em] text-[var(--cal2-text-secondary)]">
                  Следующий шаг
                </p>
                <h3 className="mt-2 text-[16px] font-semibold text-[var(--cal2-text-primary)]">
                  Сначала захват, потом решение
                </h3>
              </div>

              <p className="max-w-[34ch] text-[12px] leading-[1.55] text-[var(--cal2-text-secondary)]">
                Выберите item в списке, чтобы увидеть вторичные действия и статус. Пока ничего не сортируется
                автоматически: Inbox остаётся ручным буфером внимания.
              </p>

              <div className="rounded-[10px] border border-[var(--cal2-border)] bg-[var(--cal2-surface-1)] p-3">
                <p className="text-[11px] uppercase tracking-[0.12em] text-[var(--cal2-text-secondary)]">
                  Горячие клавиши
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <span className="rounded-full border border-[var(--cal2-border)] px-2.5 py-1 text-[11px] text-[var(--cal2-text-primary)]">
                    /
                  </span>
                  <span className="rounded-full border border-[var(--cal2-border)] px-2.5 py-1 text-[11px] text-[var(--cal2-text-primary)]">
                    Ctrl/Cmd + Shift + I
                  </span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </SurfaceCard>

      <SurfaceCard className="p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[11px] uppercase tracking-[0.12em] text-[var(--cal2-text-secondary)]">Сегодня</p>
            <h3 className="mt-1 text-[14px] font-semibold text-[var(--cal2-text-primary)]">Контекст задач</h3>
          </div>
          {selectedTask ? (
            <button
              type="button"
              onClick={() => onSelectTask(null)}
              className="text-[11px] text-[var(--cal2-text-secondary)] hover:text-[var(--cal2-text-primary)]"
            >
              Скрыть детали
            </button>
          ) : (
            <span className="text-[11px] text-[var(--cal2-text-secondary)]">{tasks.length}</span>
          )}
        </div>
        <div className="mt-3 space-y-2">
          {selectedTask ? (
            <TaskDetailsPanel
              key={selectedTask.id}
              task={selectedTask}
              subtasks={subtasks}
              onLoadSubtasks={onLoadSubtasks}
              onUpdateTask={onUpdateTask}
              onAddSubtask={onAddSubtask}
              onSetSubtaskDone={(subtaskId, taskId, done) => {
                void onSetSubtaskDone(subtaskId, taskId, done);
              }}
            />
          ) : spotlightTasks.length === 0 ? (
            <p className="text-[12px] leading-[1.5] text-[var(--cal2-text-secondary)]">
              Здесь появятся задачи, уже вынесенные из Inbox в план на день.
            </p>
          ) : (
            spotlightTasks.map((task) => (
              <button
                key={task.id}
                type="button"
                onClick={() => onSelectTask(task.id)}
                className="w-full rounded-[8px] border border-[var(--cal2-border)] bg-[var(--cal2-surface-1)] px-3 py-2 text-left"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="text-[12px] text-[var(--cal2-text-primary)]">{task.title}</p>
                  <span className="text-[10px] text-[var(--cal2-text-secondary)]">{task.progressPercent}%</span>
                </div>
                <p className="mt-1 text-[10px] text-[var(--cal2-text-secondary)]">
                  {task.dueDate ?? "Без срока"} • {task.status}
                </p>
              </button>
            ))
          )}
        </div>
      </SurfaceCard>
    </aside>
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
  captureInputRef,
  analysisByItemId,
  analysisErrorByItemId,
  analysisLoadingItemId,
  onAnalyzeItem,
}: InboxPanelProps) {
  const localCaptureInputRef = useRef<HTMLInputElement | null>(null);
  const [quickValue, setQuickValue] = useState("");
  const [isCapturePending, setIsCapturePending] = useState(false);
  const [pendingAction, setPendingAction] = useState<PendingInboxAction | null>(null);
  const [listMode, setListMode] = useState<"new" | "processed" | "archived">("new");
  const [selectedItemId, setSelectedItemId] = useState<string | null>(() => inbox.newItems[0]?.id ?? null);

  const items =
    listMode === "new"
      ? inbox.newItems
      : listMode === "processed"
        ? inbox.processedItems
        : inbox.archivedItems;

  const selectedItem = useMemo(
    () => items.find((item) => item.id === selectedItemId) ?? items[0] ?? null,
    [items, selectedItemId],
  );
  const selectedTask = useMemo(
    () => tasks.find((task) => task.id === selectedTaskId) ?? null,
    [tasks, selectedTaskId],
  );
  const selectedItemAnalysis = selectedItem ? analysisByItemId[selectedItem.id] ?? null : null;
  const selectedItemAnalysisError = selectedItem ? analysisErrorByItemId[selectedItem.id] : undefined;
  const isSelectedItemAiLoading = selectedItem ? analysisLoadingItemId === selectedItem.id : false;

  const listMeta = LIST_MODE_META[listMode];

  useEffect(() => {
    const shouldSkipAutofocus = window.matchMedia("(hover: none), (pointer: coarse)").matches;
    if (shouldSkipAutofocus) {
      return;
    }

    const timer = window.setTimeout(() => {
      localCaptureInputRef.current?.focus();
      localCaptureInputRef.current?.select();
    }, 50);

    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (captureInputRef) {
      captureInputRef.current = localCaptureInputRef.current;
    }
  }, [captureInputRef]);

  useEffect(() => {
    if (items.length === 0) {
      setSelectedItemId(null);
      return;
    }

    if (!items.some((item) => item.id === selectedItemId)) {
      setSelectedItemId(items[0].id);
    }
  }, [items, selectedItemId]);

  async function handleQuickCaptureSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = quickValue.trim();
    if (!trimmed || isCapturePending) {
      return;
    }

    setIsCapturePending(true);
    try {
      await onCreateQuickItem(trimmed);
      setQuickValue("");
      window.requestAnimationFrame(() => {
        localCaptureInputRef.current?.focus();
      });
    } finally {
      setIsCapturePending(false);
    }
  }

  async function runItemAction(
    itemId: string,
    action: PendingInboxAction["action"],
    callback: () => Promise<void> | void,
  ) {
    setPendingAction({ itemId, action });
    try {
      await callback();
    } finally {
      setPendingAction((current) =>
        current?.itemId === itemId && current.action === action ? null : current,
      );
    }
  }

  return (
    <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 xl:grid-cols-[minmax(0,1fr)_350px]">
      <section className="flex min-h-0 flex-col gap-3">
        <SurfaceCard className="overflow-hidden border-[rgba(94,106,210,0.28)] bg-[linear-gradient(180deg,rgba(94,106,210,0.16),rgba(94,106,210,0.06)_42%,rgba(30,30,30,1)_100%)] p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="max-w-[40rem]">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-[rgba(94,106,210,0.38)] bg-[rgba(94,106,210,0.12)] px-2 py-0.5 text-[10px] uppercase tracking-[0.16em] text-[#d7dbff]">
                  Inbox
                </span>
                <span className="rounded-full border border-[var(--cal2-border)] px-2 py-0.5 text-[10px] text-[var(--cal2-text-secondary)]">
                  Нажмите /, чтобы вернуть фокус
                </span>
              </div>
              <h2 className="text-[18px] font-semibold leading-[1.2] text-[var(--cal2-text-primary)]">
                Quick Capture
              </h2>
              <p className="mt-2 max-w-[44ch] text-[12px] leading-[1.55] text-[rgba(240,240,240,0.78)]">
                Одна строка сейчас, решение позже. Quick Capture всегда остаётся на экране, чтобы не терять
                спонтанные мысли и не переключать контекст.
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                void onPanicReset();
              }}
              className="rounded-[7px] border border-[var(--cal2-border)] bg-[rgba(15,15,15,0.34)] px-3 py-1.5 text-[11px] text-[var(--cal2-text-secondary)] hover:text-[var(--cal2-text-primary)]"
            >
              Panic Reset
            </button>
          </div>

          <form className="mt-4 flex flex-col gap-3 sm:flex-row" onSubmit={handleQuickCaptureSubmit}>
            <input
              ref={(node) => {
                localCaptureInputRef.current = node;
                if (captureInputRef) {
                  captureInputRef.current = node;
                }
              }}
              type="text"
              value={quickValue}
              maxLength={2000}
              id="inbox-quick-capture"
              aria-label="Quick Capture"
              onChange={(event) => setQuickValue(event.target.value)}
              placeholder="Запишите мысль, задачу или ссылку в одну строку"
              className="h-11 w-full rounded-[9px] border border-[rgba(94,106,210,0.32)] bg-[rgba(15,15,15,0.42)] px-4 text-[13px] text-[var(--cal2-text-primary)] outline-none placeholder:text-[rgba(240,240,240,0.38)] focus:border-[rgba(94,106,210,0.58)]"
            />
            <button
              type="submit"
              disabled={isCapturePending || !quickValue.trim()}
              className="h-11 rounded-[9px] border border-[rgba(94,106,210,0.45)] bg-[var(--cal2-accent-soft)] px-4 text-[12px] font-semibold text-[var(--cal2-text-primary)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isCapturePending ? "Сохраняю..." : "Добавить в Inbox"}
            </button>
          </form>

          <div className="mt-4 flex flex-wrap gap-2 text-[11px] text-[var(--cal2-text-secondary)]">
            <span className="rounded-full border border-[var(--cal2-border)] px-2.5 py-1">
              Дата: {anchorDateKey}
            </span>
            <span className="rounded-full border border-[var(--cal2-border)] px-2.5 py-1">
              Приоритетных на день: {priorityTasksTodayCount}/3
            </span>
            <span className="rounded-full border border-[var(--cal2-border)] px-2.5 py-1">
              Ctrl/Cmd + Shift + I открывает глобальный capture вне Inbox
            </span>
          </div>
        </SurfaceCard>

        <SurfaceCard className="min-h-0 p-3">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[11px] uppercase tracking-[0.12em] text-[var(--cal2-text-secondary)]">Список</p>
              <h3 className="mt-1 text-[15px] font-semibold text-[var(--cal2-text-primary)]">Inbox items</h3>
            </div>
            <span className={`rounded-full px-2.5 py-1 text-[11px] ${listMeta.tone}`}>
              {items.length} • {listMeta.label.toLowerCase()}
            </span>
          </div>

          <div className="mb-3 inline-flex rounded-[7px] border border-[var(--cal2-border)] bg-[var(--cal2-surface-1)] p-0.5">
            {(["new", "processed", "archived"] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setListMode(mode)}
                className={`rounded-[6px] px-3 py-1.5 text-[11px] font-medium ${
                  listMode === mode
                    ? "bg-[var(--cal2-accent-soft)] text-[var(--cal2-text-primary)]"
                    : "text-[var(--cal2-text-secondary)]"
                }`}
              >
                {LIST_MODE_META[mode].label}
              </button>
            ))}
          </div>

          <div className={INBOX_LIST_SCROLL_CLASSNAME}>
            {items.length === 0 ? (
              <EmptyInboxState title={listMeta.emptyTitle} description={listMeta.emptyDescription} />
            ) : (
              items.map((item) => (
                <InboxCard
                  key={item.id}
                  item={item}
                  isSelected={item.id === selectedItem?.id}
                  pendingAction={pendingAction}
                  aiAnalysis={analysisByItemId[item.id]}
                  onSelect={() => setSelectedItemId(item.id)}
                  onConvertTask={() =>
                    runItemAction(item.id, "task", () =>
                      onConvert(item.id, "task", buildInboxAiPrefillForTarget("task", analysisByItemId[item.id])),
                    )
                  }
                  onConvertEvent={() =>
                    runItemAction(item.id, "event", () =>
                      onConvert(item.id, "event", buildInboxAiPrefillForTarget("event", analysisByItemId[item.id])),
                    )
                  }
                />
              ))
            )}
          </div>
        </SurfaceCard>

        {(loading || error) && (
          <div className="rounded-[8px] border border-[var(--cal2-border)] bg-[var(--cal2-surface-2)] px-3 py-2 text-[11px] text-[var(--cal2-text-secondary)]">
            {loading ? "Загрузка..." : error}
          </div>
        )}
      </section>

      <ContextRail
        selectedItem={selectedItem}
        pendingAction={pendingAction}
        tasks={tasks}
        selectedTask={selectedTask}
        subtasks={selectedTask ? subtasksByTaskId[selectedTask.id] ?? [] : []}
        onSelectTask={onSelectTask}
        onLoadSubtasks={onLoadSubtasks}
        onUpdateTask={onUpdateTask}
        onAddSubtask={onAddSubtask}
        onSetSubtaskDone={onSetSubtaskDone}
        onConvertNote={(itemId) => runItemAction(itemId, "note", () => onConvert(itemId, "note"))}
        onArchive={(itemId) => runItemAction(itemId, "archive", () => onArchive(itemId))}
        aiAnalysis={selectedItemAnalysis}
        aiAnalysisError={selectedItemAnalysisError}
        isAiAnalyzing={isSelectedItemAiLoading}
        onAnalyze={onAnalyzeItem}
        dailyStats={dailyStats}
        weeklyStats={weeklyStats}
      />
    </div>
  );
}
