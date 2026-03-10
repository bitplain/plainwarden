"use client";

export type HomeInputMode = "ai" | "idea";

export interface HomeWorkspaceState {
  inputMode: HomeInputMode;
  aiDraft: string;
  ideaDraft: string;
  selectedInboxItemId: string | null;
  isIdeaSheetOpen: boolean;
}

export type HomeWorkspaceAction =
  | { type: "setInputMode"; mode: HomeInputMode }
  | { type: "toggleInputMode" }
  | { type: "setAiDraft"; value: string }
  | { type: "setIdeaDraft"; value: string }
  | { type: "selectInboxItem"; itemId: string | null }
  | { type: "setIdeaSheetOpen"; open: boolean };

export type HomePromptIntent = "toggle-mode" | "submit-ai" | "submit-idea" | "noop";

export function createHomeWorkspaceState(
  overrides: Partial<HomeWorkspaceState> = {},
): HomeWorkspaceState {
  return {
    inputMode: overrides.inputMode ?? "ai",
    aiDraft: overrides.aiDraft ?? "",
    ideaDraft: overrides.ideaDraft ?? "",
    selectedInboxItemId: overrides.selectedInboxItemId ?? null,
    isIdeaSheetOpen: overrides.isIdeaSheetOpen ?? false,
  };
}

export function getNextHomeInputMode(current: HomeInputMode): HomeInputMode {
  return current === "ai" ? "idea" : "ai";
}

export function normalizeIdeaDraft(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

export function getHomePromptIntent(input: {
  inputMode: HomeInputMode;
  key: string;
  shiftKey: boolean;
  nativeIsComposing: boolean;
}): HomePromptIntent {
  if (input.key === "Tab") {
    return "toggle-mode";
  }

  if (input.key !== "Enter" || input.nativeIsComposing) {
    return "noop";
  }

  if (input.inputMode === "idea") {
    return input.shiftKey ? "noop" : "submit-idea";
  }

  return input.shiftKey ? "noop" : "submit-ai";
}

export function reduceHomeWorkspaceState(
  state: HomeWorkspaceState,
  action: HomeWorkspaceAction,
): HomeWorkspaceState {
  switch (action.type) {
    case "setInputMode":
      return {
        ...state,
        inputMode: action.mode,
      };
    case "toggleInputMode":
      return {
        ...state,
        inputMode: getNextHomeInputMode(state.inputMode),
      };
    case "setAiDraft":
      return {
        ...state,
        aiDraft: action.value,
      };
    case "setIdeaDraft":
      return {
        ...state,
        ideaDraft: action.value,
      };
    case "selectInboxItem":
      return {
        ...state,
        selectedInboxItemId: action.itemId,
      };
    case "setIdeaSheetOpen":
      return {
        ...state,
        isIdeaSheetOpen: action.open,
      };
    default:
      return state;
  }
}
