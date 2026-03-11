"use client";

import { startOfDay } from "date-fns";
import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type CSSProperties,
  type FormEvent,
  type HTMLAttributes,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
} from "react";
import type { AgentMemoryItem } from "@/agent/types";
import AiChatPanel from "@/components/ai-chat/AiChatPanel";
import { readAiTheme, subscribeAiTheme, type AiTheme } from "@/components/ai-theme";
import { getAiThemeStyles } from "@/components/ai-chat/theme";
import { CALENDAR2_LINEAR_VARS } from "@/components/calendar2/calendar2-theme";
import { toDateKey } from "@/components/calendar2/date-utils";
import {
  buildInboxAiPrefillForTarget,
  getInboxItemActionState,
  type PendingInboxAction,
} from "@/components/calendar2/inbox-ui";
import { useInboxTasks } from "@/components/calendar2/useInboxTasks";
import { useAgent } from "@/hooks/useAgent";
import { useAgentMemory } from "@/hooks/useAgentMemory";
import { useNetdenStore } from "@/lib/store";
import type { InboxAiAnalysis, InboxItem } from "@/lib/types";
import {
  createHomeWorkspaceState,
  getHomePromptIntent,
  getNextHomeInputMode,
  normalizeIdeaDraft,
  reduceHomeWorkspaceState,
  type HomeInputMode,
} from "./home-workspace-state";
import { clearLegacyHomeUrlInWindow } from "./home-url-state";

type InboxListMode = "new" | "processed" | "archived";

const LIST_MODE_META = {
  new: {
    label: "Новые",
    tone: "border-[rgba(94,106,210,0.32)] bg-[rgba(94,106,210,0.14)] text-[#dfe3ff]",
    emptyTitle: "Новых идей пока нет",
    emptyDescription: "Сохранённые мысли появятся здесь сразу после ввода в режиме идеи.",
  },
  processed: {
    label: "Обработанные",
    tone: "border-[rgba(74,222,128,0.22)] bg-[rgba(74,222,128,0.12)] text-[#b4f4c9]",
    emptyTitle: "Обработанных идей пока нет",
    emptyDescription: "Здесь будут элементы, которые уже разобраны и превращены в действие.",
  },
  archived: {
    label: "Архив",
    tone: "border-[var(--cal2-border)] bg-[rgba(255,255,255,0.04)] text-[var(--cal2-text-primary)]",
    emptyTitle: "Архив пока пуст",
    emptyDescription: "Сюда попадает всё, что больше не требует внимания на главном экране.",
  },
} satisfies Record<
  InboxListMode,
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

const AI_TARGET_LABELS = {
  task: "В задачу",
  event: "В календарь",
  note: "В заметку",
  keep: "Оставить в идеях",
} as const;

const INPUT_MODE_META = {
  ai: {
    label: "AI",
    title: "Разговор",
    placeholder: "Спроси про день, фокус, риски или разложи рабочую неделю…",
    submit: "Спросить",
    helper: "Enter — отправить • Shift+Enter — новая строка",
  },
  idea: {
    label: "Идея",
    title: "Захват",
    placeholder: "Запиши мысль одной строкой и вернись к AI, когда будешь готов…",
    submit: "Сохранить",
    helper: "Enter — сохранить идею • Tab — обратно в AI",
  },
} satisfies Record<
  HomeInputMode,
  {
    label: string;
    title: string;
    placeholder: string;
    submit: string;
    helper: string;
  }
>;

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

function SurfaceFrame({
  children,
  className = "",
  style,
  ...rest
}: {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
} & HTMLAttributes<HTMLElement>) {
  return (
    <section
      {...rest}
      style={style}
      className={`rounded-[28px] border border-[var(--cal2-border)] bg-[linear-gradient(180deg,rgba(17,17,19,0.96),rgba(10,10,12,0.98))] shadow-[0_30px_90px_-55px_rgba(0,0,0,0.95)] ${className}`.trim()}
    >
      {children}
    </section>
  );
}

function getItemsForMode(
  inbox: ReturnType<typeof useInboxTasks>["inbox"],
  mode: InboxListMode,
): InboxItem[] {
  if (mode === "processed") {
    return inbox.processedItems;
  }
  if (mode === "archived") {
    return inbox.archivedItems;
  }
  return inbox.newItems;
}

function getCompactIdeaItems(
  inbox: ReturnType<typeof useInboxTasks>["inbox"],
): InboxItem[] {
  return [...inbox.newItems, ...inbox.processedItems, ...inbox.archivedItems]
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
    .slice(0, 4);
}

function CompactIdeaRail({
  items,
  newIdeasCount,
  selectedItemId,
  onOpen,
  onOpenItem,
}: {
  items: InboxItem[];
  newIdeasCount: number;
  selectedItemId: string | null;
  onOpen: () => void;
  onOpenItem: (item: InboxItem) => void;
}) {
  return (
    <SurfaceFrame className="px-4 py-4 sm:px-5" data-home-idea-rail="compact">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-[0.22em] text-[var(--cal2-text-secondary)]">
            Compact Ideas
          </p>
          <h2 className="mt-2 text-[16px] font-semibold tracking-[-0.03em] text-[var(--cal2-text-primary)]">
            Последние идеи всегда под рукой
          </h2>
        </div>

        <div className="flex items-center gap-2">
          <span className="rounded-full border border-[var(--cal2-border)] bg-[rgba(255,255,255,0.03)] px-3 py-1 text-[11px] text-[var(--cal2-text-secondary)]">
            Новых: {newIdeasCount}
          </span>
          <button
            type="button"
            onClick={onOpen}
            className="rounded-full border border-[var(--cal2-border)] bg-[rgba(255,255,255,0.04)] px-3 py-1.5 text-[11px] font-medium text-[var(--cal2-text-primary)] transition-colors hover:bg-[rgba(255,255,255,0.07)]"
          >
            Все идеи
          </button>
        </div>
      </div>

      <div className="mt-4 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
        {items.length === 0 ? (
          <div className="rounded-[20px] border border-dashed border-[var(--cal2-border)] bg-[rgba(255,255,255,0.02)] px-4 py-4 text-[12px] text-[var(--cal2-text-secondary)]">
            Сохранённые идеи появятся здесь сразу после ввода в режиме идеи.
          </div>
        ) : (
          items.map((item) => {
            const isSelected = item.id === selectedItemId;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onOpenItem(item)}
                className={`min-w-[220px] max-w-[260px] rounded-[20px] border px-3 py-3 text-left transition-colors ${
                  isSelected
                    ? "border-[rgba(94,106,210,0.5)] bg-[rgba(94,106,210,0.14)]"
                    : "border-[var(--cal2-border)] bg-[rgba(255,255,255,0.03)] hover:border-[rgba(94,106,210,0.28)]"
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="rounded-full border border-[var(--cal2-border)] px-2 py-0.5 text-[10px] uppercase tracking-[0.12em] text-[var(--cal2-text-secondary)]">
                    {TYPE_HINT_LABELS[item.typeHint]}
                  </span>
                  <span className="text-[10px] text-[var(--cal2-text-secondary)]">
                    {formatInboxTimestamp(item.updatedAt)}
                  </span>
                </div>
                <p className="mt-3 line-clamp-2 text-[13px] leading-[1.5] text-[var(--cal2-text-primary)]">
                  {item.content}
                </p>
              </button>
            );
          })
        )}
      </div>
    </SurfaceFrame>
  );
}

function IdeaListCard({
  item,
  isSelected,
  onSelect,
}: {
  item: InboxItem;
  isSelected: boolean;
  onSelect: () => void;
}) {
  return (
    <article
      className={`rounded-[20px] border transition-colors ${
        isSelected
          ? "border-[rgba(94,106,210,0.48)] bg-[rgba(94,106,210,0.13)]"
          : "border-[var(--cal2-border)] bg-[rgba(255,255,255,0.02)] hover:border-[rgba(94,106,210,0.26)]"
      }`}
    >
      <button type="button" onClick={onSelect} className="block w-full px-4 py-4 text-left">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="mb-2 flex flex-wrap items-center gap-1.5">
              <span className="rounded-full border border-[var(--cal2-border)] px-2 py-0.5 text-[10px] uppercase tracking-[0.12em] text-[var(--cal2-text-secondary)]">
                {TYPE_HINT_LABELS[item.typeHint]}
              </span>
              <span className="rounded-full bg-[rgba(255,255,255,0.06)] px-2 py-0.5 text-[10px] text-[var(--cal2-text-primary)]">
                {LIST_MODE_META[item.status].label}
              </span>
            </div>
            <p className="text-[13px] leading-[1.55] text-[var(--cal2-text-primary)]">{item.content}</p>
          </div>
          <span className="shrink-0 text-[10px] text-[var(--cal2-text-secondary)]">
            {formatInboxTimestamp(item.updatedAt)}
          </span>
        </div>
      </button>
    </article>
  );
}

function IdeaDetailPanel({
  selectedItem,
  pendingAction,
  aiAnalysis,
  aiAnalysisError,
  isAiAnalyzing,
  onAnalyze,
  onConvertTask,
  onConvertEvent,
  onConvertNote,
  onArchive,
  priorityTasksTodayCount,
}: {
  selectedItem: InboxItem | null;
  pendingAction: PendingInboxAction | null;
  aiAnalysis?: InboxAiAnalysis | null;
  aiAnalysisError?: string;
  isAiAnalyzing: boolean;
  onAnalyze: (itemId: string) => Promise<unknown> | void;
  onConvertTask: (itemId: string) => Promise<void>;
  onConvertEvent: (itemId: string) => Promise<void>;
  onConvertNote: (itemId: string) => Promise<void>;
  onArchive: (itemId: string) => Promise<void>;
  priorityTasksTodayCount: number;
}) {
  if (!selectedItem) {
    return (
      <SurfaceFrame className="p-4">
        <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--cal2-text-secondary)]">
          Detail
        </p>
        <h3 className="mt-2 text-[18px] font-semibold text-[var(--cal2-text-primary)]">
          Выберите идею из списка
        </h3>
        <p className="mt-2 text-[12px] leading-[1.6] text-[var(--cal2-text-secondary)]">
          Здесь появится краткая сводка и действия по выбранному элементу.
        </p>
      </SurfaceFrame>
    );
  }

  const actionState = getInboxItemActionState(selectedItem, pendingAction);

  return (
    <div className="flex min-h-0 flex-col gap-3">
      <SurfaceFrame className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--cal2-text-secondary)]">
              Detail
            </p>
            <h3 className="mt-2 text-[18px] font-semibold text-[var(--cal2-text-primary)]">
              {selectedItem.content}
            </h3>
          </div>
          <span className="rounded-full border border-[var(--cal2-border)] px-2.5 py-1 text-[10px] uppercase tracking-[0.12em] text-[var(--cal2-text-secondary)]">
            {actionState.statusLabel}
          </span>
        </div>

        <p className="mt-3 text-[12px] leading-[1.6] text-[var(--cal2-text-secondary)]">
          {TYPE_HINT_LABELS[selectedItem.typeHint]} • {formatInboxTimestamp(selectedItem.updatedAt)}
        </p>

        <div className="mt-4 rounded-[20px] border border-[var(--cal2-border)] bg-[rgba(255,255,255,0.03)] p-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] uppercase tracking-[0.14em] text-[var(--cal2-text-secondary)]">
                AI summary
              </p>
              <p className="mt-2 text-[12px] leading-[1.6] text-[var(--cal2-text-primary)]">
                {isAiAnalyzing
                  ? "AI анализирует идею и подбирает следующий шаг."
                  : aiAnalysis?.summary ??
                    aiAnalysisError ??
                    "Если нужен совет по разбору, запустите AI-анализ прямо отсюда."}
              </p>
            </div>

            {!aiAnalysis && !isAiAnalyzing ? (
              <button
                type="button"
                onClick={() => {
                  void onAnalyze(selectedItem.id);
                }}
                className="rounded-full border border-[rgba(94,106,210,0.42)] bg-[rgba(94,106,210,0.14)] px-3 py-1.5 text-[11px] font-medium text-[var(--cal2-text-primary)]"
              >
                AI-разобрать
              </button>
            ) : null}
          </div>

          {aiAnalysis ? (
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="rounded-full border border-[var(--cal2-border)] px-2.5 py-1 text-[11px] text-[var(--cal2-text-primary)]">
                {AI_TARGET_LABELS[aiAnalysis.recommendedTarget]}
              </span>
              {aiAnalysis.suggestedDate ? (
                <span className="rounded-full border border-[var(--cal2-border)] px-2.5 py-1 text-[11px] text-[var(--cal2-text-secondary)]">
                  Дата: {aiAnalysis.suggestedDate}
                </span>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          <button
            type="button"
            disabled={!actionState.canConvertToTask}
            onClick={() => void onConvertTask(selectedItem.id)}
            className="rounded-[16px] border border-[rgba(94,106,210,0.42)] bg-[rgba(94,106,210,0.14)] px-3 py-2 text-[12px] font-medium text-[var(--cal2-text-primary)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            В задачу
          </button>
          <button
            type="button"
            disabled={!actionState.canConvertToEvent}
            onClick={() => void onConvertEvent(selectedItem.id)}
            className="rounded-[16px] border border-[var(--cal2-border)] bg-[rgba(255,255,255,0.03)] px-3 py-2 text-[12px] font-medium text-[var(--cal2-text-primary)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            В календарь
          </button>
          <button
            type="button"
            disabled={!actionState.canConvertToNote}
            onClick={() => void onConvertNote(selectedItem.id)}
            className="rounded-[16px] border border-[var(--cal2-border)] bg-[rgba(255,255,255,0.03)] px-3 py-2 text-[12px] font-medium text-[var(--cal2-text-primary)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            В заметку
          </button>
          <button
            type="button"
            disabled={!actionState.canArchive}
            onClick={() => void onArchive(selectedItem.id)}
            className="rounded-[16px] border border-[var(--cal2-border)] bg-transparent px-3 py-2 text-[12px] font-medium text-[var(--cal2-text-secondary)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            Архивировать
          </button>
        </div>
      </SurfaceFrame>

      <SurfaceFrame className="p-4">
        <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--cal2-text-secondary)]">
          Today
        </p>
        <h3 className="mt-2 text-[18px] font-semibold text-[var(--cal2-text-primary)]">
          Приоритетных задач на сегодня: {priorityTasksTodayCount}
        </h3>
        <p className="mt-2 text-[12px] leading-[1.6] text-[var(--cal2-text-secondary)]">
          Сначала сохраняйте мысль в один клик, потом решайте в sheet, превращать ли её в план или событие.
        </p>
      </SurfaceFrame>
    </div>
  );
}

function stopSheetClose(event: MouseEvent<HTMLDivElement>) {
  event.stopPropagation();
}

export default function HomeWorkspace({
  initialInputMode = "ai",
  initialAnchorDateKey,
  shouldCanonicalizeLegacyQuery = false,
}: {
  initialInputMode?: HomeInputMode;
  initialAnchorDateKey?: string;
  shouldCanonicalizeLegacyQuery?: boolean;
}) {
  const initialState = useMemo(
    () =>
      createHomeWorkspaceState({
        inputMode: initialInputMode,
      }),
    [initialInputMode],
  );
  const [workspaceState, dispatch] = useReducer(reduceHomeWorkspaceState, initialState);
  const [listMode, setListMode] = useState<InboxListMode>("new");
  const [pendingAction, setPendingAction] = useState<PendingInboxAction | null>(null);
  const [isIdeaSubmitPending, setIsIdeaSubmitPending] = useState(false);
  const [theme, setTheme] = useState<AiTheme>(() => readAiTheme());
  const promptInputRef = useRef<HTMLTextAreaElement>(null);
  const anchorDateKey = initialAnchorDateKey ?? toDateKey(startOfDay(new Date()));

  const bootstrapAuth = useNetdenStore((state) => state.bootstrapAuth);
  useEffect(() => {
    void bootstrapAuth();
  }, [bootstrapAuth]);

  const inboxTasks = useInboxTasks(anchorDateKey);
  const items = useMemo(
    () => getItemsForMode(inboxTasks.inbox, listMode),
    [inboxTasks.inbox, listMode],
  );
  const compactIdeaItems = useMemo(
    () => getCompactIdeaItems(inboxTasks.inbox),
    [inboxTasks.inbox],
  );
  const selectedItem = useMemo(
    () => items.find((item) => item.id === workspaceState.selectedInboxItemId) ?? items[0] ?? null,
    [items, workspaceState.selectedInboxItemId],
  );
  const selectedItemAnalysis = selectedItem ? inboxTasks.analysisByItemId[selectedItem.id] ?? null : null;
  const selectedItemAnalysisError = selectedItem ? inboxTasks.analysisErrorByItemId[selectedItem.id] : undefined;
  const isSelectedItemAiLoading = selectedItem ? inboxTasks.analysisLoadingItemId === selectedItem.id : false;

  const { items: memoryItems } = useAgentMemory();
  const {
    messages,
    isStreaming,
    pendingAction: pendingAgentAction,
    sendMessage,
    resolveAction,
  } = useAgent({
    onNavigate: (path) => {
      if (typeof window !== "undefined") {
        window.location.assign(path);
      }
    },
  });

  useEffect(() => subscribeAiTheme(setTheme), []);

  useEffect(() => {
    if (shouldCanonicalizeLegacyQuery) {
      clearLegacyHomeUrlInWindow();
    }
  }, [shouldCanonicalizeLegacyQuery]);

  useEffect(() => {
    if (items.length === 0) {
      dispatch({ type: "selectInboxItem", itemId: null });
      return;
    }

    if (!items.some((item) => item.id === workspaceState.selectedInboxItemId)) {
      dispatch({ type: "selectInboxItem", itemId: items[0].id });
    }
  }, [items, workspaceState.selectedInboxItemId]);

  useEffect(() => {
    const node = promptInputRef.current;
    if (!node) {
      return;
    }

    node.style.height = "0px";
    node.style.height = `${Math.min(node.scrollHeight, 108)}px`;
  }, [workspaceState.aiDraft, workspaceState.ideaDraft, workspaceState.inputMode]);

  useEffect(() => {
    if (!workspaceState.isIdeaSheetOpen || typeof window === "undefined") {
      return;
    }

    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") {
        dispatch({ type: "setIdeaSheetOpen", open: false });
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [workspaceState.isIdeaSheetOpen]);

  const activePromptValue =
    workspaceState.inputMode === "ai" ? workspaceState.aiDraft : workspaceState.ideaDraft;
  const activeModeMeta = INPUT_MODE_META[workspaceState.inputMode];

  const focusPromptAtEnd = useCallback(() => {
    const node = promptInputRef.current;
    if (!node) {
      return;
    }

    node.focus();
    const end = node.value.length;
    node.setSelectionRange(end, end);
  }, []);

  const switchInputMode = useCallback(
    (mode: HomeInputMode) => {
      dispatch({ type: "setInputMode", mode });
      if (typeof window !== "undefined") {
        window.requestAnimationFrame(() => {
          focusPromptAtEnd();
        });
      }
    },
    [focusPromptAtEnd],
  );

  const handleSend = useCallback(async () => {
    const text = workspaceState.aiDraft.trim();
    if (!text || isStreaming) {
      return;
    }

    dispatch({ type: "setAiDraft", value: "" });
    await sendMessage(text, memoryItems as AgentMemoryItem[]);
  }, [isStreaming, memoryItems, sendMessage, workspaceState.aiDraft]);

  const handleResolveAction = useCallback(
    async (approved: boolean) => {
      await resolveAction(approved, memoryItems as AgentMemoryItem[]);
    },
    [memoryItems, resolveAction],
  );

  const handleIdeaSubmit = useCallback(async () => {
    const normalized = normalizeIdeaDraft(workspaceState.ideaDraft);
    if (!normalized || isIdeaSubmitPending) {
      return;
    }

    setIsIdeaSubmitPending(true);
    try {
      await inboxTasks.createInboxItem(normalized, "idea");
      dispatch({ type: "setIdeaDraft", value: "" });
    } finally {
      setIsIdeaSubmitPending(false);
    }
  }, [inboxTasks, isIdeaSubmitPending, workspaceState.ideaDraft]);

  const handlePromptSubmit = useCallback(
    async (event?: FormEvent<HTMLFormElement>) => {
      event?.preventDefault();
      if (workspaceState.inputMode === "ai") {
        await handleSend();
        return;
      }

      await handleIdeaSubmit();
    },
    [handleIdeaSubmit, handleSend, workspaceState.inputMode],
  );

  const handlePromptChange = useCallback(
    (value: string) => {
      dispatch({
        type: workspaceState.inputMode === "ai" ? "setAiDraft" : "setIdeaDraft",
        value,
      });
    },
    [workspaceState.inputMode],
  );

  const handlePromptKeyDown = useCallback(
    (event: KeyboardEvent<HTMLTextAreaElement>) => {
      if (event.altKey || event.ctrlKey || event.metaKey) {
        return;
      }

      const intent = getHomePromptIntent({
        inputMode: workspaceState.inputMode,
        key: event.key,
        shiftKey: event.shiftKey,
        nativeIsComposing: event.nativeEvent.isComposing,
      });

      if (intent === "toggle-mode") {
        event.preventDefault();
        switchInputMode(getNextHomeInputMode(workspaceState.inputMode));
        return;
      }

      if (intent === "submit-ai" || intent === "submit-idea") {
        event.preventDefault();
        void handlePromptSubmit();
      }
    },
    [handlePromptSubmit, switchInputMode, workspaceState.inputMode],
  );

  const openIdeaSheet = useCallback(
    (item?: InboxItem) => {
      if (item) {
        setListMode(item.status);
        dispatch({ type: "selectInboxItem", itemId: item.id });
      }
      dispatch({ type: "setIdeaSheetOpen", open: true });
    },
    [],
  );

  const closeIdeaSheet = useCallback(() => {
    dispatch({ type: "setIdeaSheetOpen", open: false });
  }, []);

  const runItemAction = useCallback(
    async (
      itemId: string,
      action: PendingInboxAction["action"],
      callback: () => Promise<void> | void,
    ) => {
      setPendingAction({ itemId, action });
      try {
        await callback();
      } finally {
        setPendingAction((current) =>
          current?.itemId === itemId && current.action === action ? null : current,
        );
      }
    },
    [],
  );

  const isPromptBusy = workspaceState.inputMode === "ai" ? isStreaming : isIdeaSubmitPending;
  const canSubmit =
    (workspaceState.inputMode === "ai"
      ? workspaceState.aiDraft.trim().length > 0
      : normalizeIdeaDraft(workspaceState.ideaDraft).length > 0) && !isPromptBusy;

  return (
    <div style={CALENDAR2_LINEAR_VARS} data-home-layout="single-surface" className="flex min-h-0 flex-1 flex-col">
      <form
          style={getAiThemeStyles(theme)}
          onSubmit={(event) => {
            void handlePromptSubmit(event);
          }}
          data-home-prompt-bar="true"
          data-home-input-mode={workspaceState.inputMode}
          className="sticky top-3 z-20 rounded-[30px] border border-[var(--ai-border)] bg-[rgba(11,11,13,0.94)] p-3 shadow-[0_30px_80px_-52px_rgba(0,0,0,0.96)] backdrop-blur-xl"
        >
          <div className="rounded-[24px] border border-[var(--ai-border)] bg-[var(--ai-canvas)] px-3 py-3 transition-shadow focus-within:border-[var(--ai-accent)] focus-within:shadow-[0_0_28px_var(--ai-accent-soft)] sm:px-4">
            <div className="flex items-center gap-2 pb-2">
              <button
                type="button"
                onClick={() => switchInputMode(getNextHomeInputMode(workspaceState.inputMode))}
                className="rounded-full border border-[var(--ai-border)] bg-[var(--ai-accent-soft)] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--ai-text-primary)]"
              >
                {activeModeMeta.label}
              </button>
              <span className="text-[11px] text-[var(--ai-text-muted)]">{activeModeMeta.title}</span>
              <span className="ml-auto rounded-full border border-[var(--ai-border)] bg-white/[0.03] px-2.5 py-1 text-[10px] uppercase tracking-[0.12em] text-[var(--ai-text-dim)]">
                Tab
              </span>
            </div>

            <div className="flex items-end gap-2">
              <textarea
                ref={promptInputRef}
                value={activePromptValue}
                onChange={(event) => handlePromptChange(event.target.value)}
                onKeyDown={handlePromptKeyDown}
                rows={1}
                spellCheck={false}
                disabled={isPromptBusy}
                placeholder={activeModeMeta.placeholder}
                className="max-h-[108px] min-h-[48px] flex-1 resize-none bg-transparent px-2 py-2 text-[14px] leading-[1.6] text-[var(--ai-text-primary)] outline-none placeholder:text-[var(--ai-text-dim)] disabled:cursor-not-allowed disabled:opacity-60"
              />

              <button
                type="submit"
                disabled={!canSubmit}
                className="h-11 rounded-full bg-[var(--ai-accent)] px-4 text-[12px] font-semibold text-white shadow-[0_10px_30px_-16px_var(--ai-accent-glow)] transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
              >
                {isPromptBusy
                  ? workspaceState.inputMode === "ai"
                    ? "Отправка…"
                    : "Сохраняю…"
                  : activeModeMeta.submit}
              </button>
            </div>
          </div>

          <div className="mt-2 flex flex-wrap items-center justify-between gap-2 px-1 text-[11px] text-[var(--ai-text-dim)]">
            <span>{activeModeMeta.helper}</span>
            <span>Один input, два контекста, без переключения между окнами</span>
          </div>
        </form>

      <main className="mt-4 flex min-h-0 flex-1 flex-col gap-4">
          <CompactIdeaRail
            items={compactIdeaItems}
            newIdeasCount={inboxTasks.inbox.newItems.length}
            selectedItemId={workspaceState.selectedInboxItemId}
            onOpen={() => openIdeaSheet()}
            onOpenItem={openIdeaSheet}
          />

          <div className="min-h-0 flex-1">
            <AiChatPanel
              mode="embedded"
              layoutVariant="stream"
              theme={theme}
              title="AI home"
              subtitle="Главный поток для разговора и разбора дня."
              messages={messages}
              isStreaming={isStreaming}
              pendingAction={pendingAgentAction}
              inputValue=""
              inputPlaceholder=""
              activeChipId={null}
              chips={[]}
              suggestions={[]}
              onChipClick={() => undefined}
              onSuggestionSelect={() => undefined}
              onInputChange={() => undefined}
              onSubmit={handleSend}
              onResolveAction={handleResolveAction}
              emptyTitle="Начните с одного вопроса"
              emptyBody="Спросите AI про день, затем одним Tab переключайтесь в режим идеи, когда нужно что-то быстро зафиксировать."
              footerHint=""
            />
          </div>
      </main>

      {workspaceState.isIdeaSheetOpen ? (
        <div
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm"
          onClick={closeIdeaSheet}
          data-home-idea-sheet="open"
        >
          <div className="mx-auto flex h-full max-w-[1280px] items-end px-2 py-2 sm:px-5 sm:py-4">
            <div
              className="flex h-[86dvh] w-full flex-col overflow-hidden rounded-[30px] border border-[var(--cal2-border)] bg-[linear-gradient(180deg,rgba(16,16,18,0.98),rgba(9,9,11,0.99))] shadow-[0_40px_120px_-42px_rgba(0,0,0,0.96)]"
              onClick={stopSheetClose}
            >
              <div className="flex items-center justify-between gap-3 border-b border-[var(--cal2-border)] px-4 py-4 sm:px-5">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--cal2-text-secondary)]">
                    Idea sheet
                  </p>
                  <h2 className="mt-2 text-[22px] font-semibold tracking-[-0.04em] text-[var(--cal2-text-primary)]">
                    Полный список идей
                  </h2>
                </div>

                <button
                  type="button"
                  onClick={closeIdeaSheet}
                  className="rounded-full border border-[var(--cal2-border)] bg-[rgba(255,255,255,0.04)] px-3 py-1.5 text-[11px] font-medium text-[var(--cal2-text-primary)]"
                >
                  Закрыть
                </button>
              </div>

              <div className="grid min-h-0 flex-1 gap-4 overflow-hidden p-4 sm:px-5 sm:pb-5 xl:grid-cols-[minmax(0,1fr)_360px]">
                <div className="flex min-h-0 flex-col">
                  <div className="mb-4 inline-flex w-max rounded-full border border-[var(--cal2-border)] bg-[rgba(255,255,255,0.03)] p-1">
                    {(["new", "processed", "archived"] as const).map((mode) => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => setListMode(mode)}
                        className={`rounded-full px-3 py-1.5 text-[11px] font-medium ${
                          listMode === mode
                            ? "bg-[rgba(94,106,210,0.16)] text-[var(--cal2-text-primary)]"
                            : "text-[var(--cal2-text-secondary)]"
                        }`}
                      >
                        {LIST_MODE_META[mode].label}
                      </button>
                    ))}
                  </div>

                  <div className="min-h-0 space-y-3 overflow-y-auto pr-1">
                    {items.length === 0 ? (
                      <SurfaceFrame className="border-dashed px-4 py-5">
                        <h3 className="text-[15px] font-semibold text-[var(--cal2-text-primary)]">
                          {LIST_MODE_META[listMode].emptyTitle}
                        </h3>
                        <p className="mt-2 text-[12px] leading-[1.6] text-[var(--cal2-text-secondary)]">
                          {LIST_MODE_META[listMode].emptyDescription}
                        </p>
                      </SurfaceFrame>
                    ) : (
                      items.map((item) => (
                        <IdeaListCard
                          key={item.id}
                          item={item}
                          isSelected={item.id === selectedItem?.id}
                          onSelect={() => dispatch({ type: "selectInboxItem", itemId: item.id })}
                        />
                      ))
                    )}
                  </div>
                </div>

                <div className="min-h-0 overflow-y-auto pr-1">
                  <IdeaDetailPanel
                    selectedItem={selectedItem}
                    pendingAction={pendingAction}
                    aiAnalysis={selectedItemAnalysis}
                    aiAnalysisError={selectedItemAnalysisError}
                    isAiAnalyzing={isSelectedItemAiLoading}
                    onAnalyze={inboxTasks.analyzeInboxItem}
                    onConvertTask={(itemId) =>
                      runItemAction(itemId, "task", () =>
                        inboxTasks.convertInboxItem(
                          itemId,
                          "task",
                          buildInboxAiPrefillForTarget("task", inboxTasks.analysisByItemId[itemId]),
                        ),
                      )
                    }
                    onConvertEvent={(itemId) =>
                      runItemAction(itemId, "event", () =>
                        inboxTasks.convertInboxItem(
                          itemId,
                          "event",
                          buildInboxAiPrefillForTarget("event", inboxTasks.analysisByItemId[itemId]),
                        ),
                      )
                    }
                    onConvertNote={(itemId) =>
                      runItemAction(itemId, "note", () => inboxTasks.convertInboxItem(itemId, "note"))
                    }
                    onArchive={(itemId) =>
                      runItemAction(itemId, "archive", () => inboxTasks.archiveInboxItem(itemId))
                    }
                    priorityTasksTodayCount={inboxTasks.priorityTasksToday.length}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
