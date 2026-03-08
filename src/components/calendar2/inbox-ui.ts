import type {
  ConvertInboxItemInput,
  InboxAiAnalysis,
  InboxConvertedEntityType,
  InboxItem,
} from "@/lib/types";
import type { Calendar2Tab } from "./calendar2-types";

export type PendingInboxActionType = "task" | "event" | "note" | "archive";

export interface PendingInboxAction {
  itemId: string;
  action: PendingInboxActionType;
}

export type InboxCaptureShortcutAction = "none" | "focus-inline" | "open-modal";

interface ResolveInboxCaptureShortcutInput {
  activeTab: Calendar2Tab;
  key: string;
  ctrlKey: boolean;
  metaKey: boolean;
  shiftKey: boolean;
  isTypingTarget: boolean;
}

const STATUS_LABELS: Record<InboxItem["status"], string> = {
  new: "Новый",
  processed: "Обработан",
  archived: "В архиве",
};

export function resolveInboxCaptureShortcut(
  input: ResolveInboxCaptureShortcutInput,
): InboxCaptureShortcutAction {
  if (input.isTypingTarget) {
    return "none";
  }

  const key = input.key.toLowerCase();
  const isLegacyShortcut = (input.metaKey || input.ctrlKey) && input.shiftKey && key === "i";
  const isInlineRefocusShortcut = key === "/";

  if (!isLegacyShortcut && !isInlineRefocusShortcut) {
    return "none";
  }

  if (input.activeTab === "inbox") {
    return "focus-inline";
  }

  return isLegacyShortcut ? "open-modal" : "none";
}

export function getInboxItemActionState(item: InboxItem, pendingAction?: PendingInboxAction | null) {
  const isPending = pendingAction?.itemId === item.id;
  const canConvert = item.status === "new" && !isPending;
  const canArchive = item.status !== "archived" && !isPending;

  return {
    canConvertToTask: canConvert,
    canConvertToEvent: canConvert,
    canConvertToNote: canConvert,
    canArchive,
    isPending,
    isTerminalState: item.status === "archived",
    statusLabel: STATUS_LABELS[item.status],
  };
}

export function buildInboxAiPrefillForTarget(
  target: InboxConvertedEntityType,
  analysis?: InboxAiAnalysis | null,
): Omit<ConvertInboxItemInput, "target"> {
  if (!analysis || analysis.recommendedTarget !== target) {
    return {};
  }

  if (target === "task") {
    return {
      dueDate: analysis.suggestedDueDate,
      isPriority: analysis.suggestedPriority,
    };
  }

  if (target === "event") {
    return {
      date: analysis.suggestedDate,
    };
  }

  return {};
}
