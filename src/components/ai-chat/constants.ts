import type { AiTheme } from "@/components/ai-theme";

export interface AiPromptChip {
  id: string;
  icon: string;
  label: string;
  prompt: string;
}

export interface AiSuggestion {
  id: string;
  title: string;
  prompt: string;
}

export type AiChatMode = "floating" | "embedded";

export const AI_CHAT_CONTEXT_CHIPS: readonly AiPromptChip[] = [
  { id: "calendar", icon: "◈", label: "Календарь", prompt: "Расскажи о моих ближайших событиях" },
  { id: "tasks", icon: "◇", label: "Задачи", prompt: "Покажи мои текущие задачи" },
  { id: "notes", icon: "▧", label: "Заметки", prompt: "Что в моих заметках?" },
] as const;

const AI_CHAT_WIDGET_SUGGESTIONS: readonly AiSuggestion[] = [
  {
    id: "tomorrow",
    title: "План на завтра",
    prompt: "Покажи мой план на завтра и выдели главное",
  },
  {
    id: "week",
    title: "Неделя целиком",
    prompt: "Что запланировано на эту неделю?",
  },
  {
    id: "capture",
    title: "Быстрый захват",
    prompt: "Добавь заметку с кратким планом дня",
  },
] as const;

const AI_CHAT_CALENDAR_SUGGESTIONS: readonly AiSuggestion[] = [
  {
    id: "focus",
    title: "Фокус недели",
    prompt: "Какие события и задачи требуют главного фокуса на этой неделе?",
  },
  {
    id: "deadlines",
    title: "Ближайшие дедлайны",
    prompt: "Покажи ближайшие дедлайны и возможные конфликты в календаре",
  },
  {
    id: "rebalance",
    title: "Перебалансировка",
    prompt: "Где у меня перегруз по дням и что лучше перенести?",
  },
] as const;

export const AI_THEME_META: Record<
  AiTheme,
  {
    label: string;
    description: string;
  }
> = {
  cyber: {
    label: "Cyber Pulse",
    description: "Холодный indigo-акцент и clean product shell без неона.",
  },
  ambient: {
    label: "Ambient Flow",
    description: "Тёплый amber-акцент внутри той же строгой тёмной системы.",
  },
  terminal: {
    label: "Terminal AI",
    description: "Зелёный signal-акцент в том же взрослом UI-контуре.",
  },
};

export function getAiChatSuggestions(mode: AiChatMode): readonly AiSuggestion[] {
  return mode === "embedded" ? AI_CHAT_CALENDAR_SUGGESTIONS : AI_CHAT_WIDGET_SUGGESTIONS;
}

export function getAiScrollBehavior(input: {
  hasMessages: boolean;
  isStreaming: boolean;
}): ScrollBehavior {
  if (input.isStreaming || !input.hasMessages) {
    return "auto";
  }

  return "smooth";
}

export function getAiWidgetToggleState(input: {
  isOpen: boolean;
  activeChipId: string | null;
}): {
  isOpen: boolean;
  activeChipId: string | null;
} {
  const nextIsOpen = !input.isOpen;

  return {
    isOpen: nextIsOpen,
    activeChipId: nextIsOpen ? input.activeChipId : null,
  };
}
