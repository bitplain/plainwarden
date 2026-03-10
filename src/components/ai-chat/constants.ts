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
export type AiSurfaceStage = "empty" | "active";
export type AiSurfaceTone = "standard" | "compact";
export type AiSurfaceRail = "fluid" | "centered";
export type AiChipFlow = "wrap" | "scroll";

interface AiSurfaceLayoutInput {
  mode: AiChatMode;
  hasMessages: boolean;
  hasPendingAction: boolean;
}

interface AiSurfaceLayoutTokens {
  embeddedRailMaxWidthClassName: string;
  floatingWidgetWidthClassName: string;
  floatingHeightClassNames: Record<AiSurfaceStage, string>;
  chipSizeClassNames: Record<AiSurfaceTone, string>;
  badgeSizeClassNames: Record<AiSurfaceTone, string>;
  composerButtonSizeClassNames: Record<AiSurfaceTone, string>;
}

export interface AiSurfaceLayout {
  stage: AiSurfaceStage;
  rail: AiSurfaceRail;
  railMaxWidthClassName: string;
  widgetWidthClassName: string;
  widgetHeightClassName: string;
  headerTone: AiSurfaceTone;
  metaTone: AiSurfaceTone;
  composerTone: AiSurfaceTone;
  chipFlow: AiChipFlow;
  chipSizeClassName: string;
  badgeSizeClassName: string;
  composerButtonSizeClassName: string;
}

const AI_CHAT_LAYOUT_TOKENS: AiSurfaceLayoutTokens = {
  embeddedRailMaxWidthClassName: "max-w-[1360px]",
  floatingWidgetWidthClassName: "sm:w-[430px]",
  floatingHeightClassNames: {
    empty: "h-[46rem] max-h-[82dvh]",
    active: "h-[38rem] max-h-[74dvh]",
  },
  chipSizeClassNames: {
    standard: "h-10 px-4 text-[12px]",
    compact: "h-9 px-3.5 text-[12px]",
  },
  badgeSizeClassNames: {
    standard: "h-9 px-3.5 text-[10px]",
    compact: "h-8 px-3 text-[10px]",
  },
  composerButtonSizeClassNames: {
    standard: "h-11 w-11",
    compact: "h-12 w-12",
  },
};

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

export function getAiSurfaceLayout(input: AiSurfaceLayoutInput): AiSurfaceLayout {
  const stage: AiSurfaceStage = input.hasMessages || input.hasPendingAction ? "active" : "empty";
  const isFloating = input.mode === "floating";
  const compactFloating = isFloating && stage === "active";
  const compactShared = stage === "active";
  const tone: AiSurfaceTone = compactShared ? "compact" : "standard";

  return {
    stage,
    rail: input.mode === "embedded" ? "centered" : "fluid",
    railMaxWidthClassName:
      input.mode === "embedded" ? AI_CHAT_LAYOUT_TOKENS.embeddedRailMaxWidthClassName : "",
    widgetWidthClassName: isFloating ? AI_CHAT_LAYOUT_TOKENS.floatingWidgetWidthClassName : "",
    widgetHeightClassName: isFloating
      ? AI_CHAT_LAYOUT_TOKENS.floatingHeightClassNames[stage]
      : "",
    headerTone: compactFloating ? "compact" : "standard",
    metaTone: tone,
    composerTone: tone,
    chipFlow: compactFloating ? "scroll" : "wrap",
    chipSizeClassName: AI_CHAT_LAYOUT_TOKENS.chipSizeClassNames[tone],
    badgeSizeClassName: AI_CHAT_LAYOUT_TOKENS.badgeSizeClassNames[
      compactFloating ? "compact" : "standard"
    ],
    composerButtonSizeClassName: AI_CHAT_LAYOUT_TOKENS.composerButtonSizeClassNames[tone],
  };
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
