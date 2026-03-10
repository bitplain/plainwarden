import { describe, expect, it } from "vitest";
import {
  createHomeWorkspaceState,
  getHomePromptIntent,
  getNextHomeInputMode,
  normalizeIdeaDraft,
  reduceHomeWorkspaceState,
} from "@/components/home/home-workspace-state";

describe("getNextHomeInputMode", () => {
  it("cycles between ai and idea modes in both tab directions", () => {
    expect(getNextHomeInputMode("ai")).toBe("idea");
    expect(getNextHomeInputMode("idea")).toBe("ai");
  });
});

describe("normalizeIdeaDraft", () => {
  it("collapses multiline capture into one clean line", () => {
    expect(normalizeIdeaDraft("  Позвонить\n\nв клинику   завтра ")).toBe("Позвонить в клинику завтра");
  });
});

describe("getHomePromptIntent", () => {
  it("switches mode on tab without leaking keyboard handling outside the prompt", () => {
    expect(
      getHomePromptIntent({
        inputMode: "ai",
        key: "Tab",
        shiftKey: false,
        nativeIsComposing: false,
      }),
    ).toBe("toggle-mode");
    expect(
      getHomePromptIntent({
        inputMode: "idea",
        key: "Tab",
        shiftKey: true,
        nativeIsComposing: false,
      }),
    ).toBe("toggle-mode");
  });

  it("submits according to the active mode", () => {
    expect(
      getHomePromptIntent({
        inputMode: "ai",
        key: "Enter",
        shiftKey: false,
        nativeIsComposing: false,
      }),
    ).toBe("submit-ai");

    expect(
      getHomePromptIntent({
        inputMode: "idea",
        key: "Enter",
        shiftKey: false,
        nativeIsComposing: false,
      }),
    ).toBe("submit-idea");

    expect(
      getHomePromptIntent({
        inputMode: "ai",
        key: "Enter",
        shiftKey: true,
        nativeIsComposing: false,
      }),
    ).toBe("noop");
  });
});

describe("reduceHomeWorkspaceState", () => {
  it("preserves both drafts and selection when prompt mode changes", () => {
    let state = createHomeWorkspaceState();
    state = reduceHomeWorkspaceState(state, { type: "setAiDraft", value: "Разложи неделю" });
    state = reduceHomeWorkspaceState(state, { type: "setIdeaDraft", value: "Позвонить врачу" });
    state = reduceHomeWorkspaceState(state, { type: "selectInboxItem", itemId: "item-42" });
    state = reduceHomeWorkspaceState(state, { type: "toggleInputMode" });

    expect(state.inputMode).toBe("idea");
    expect(state.aiDraft).toBe("Разложи неделю");
    expect(state.ideaDraft).toBe("Позвонить врачу");
    expect(state.selectedInboxItemId).toBe("item-42");
  });

  it("tracks whether the full idea sheet is open", () => {
    let state = createHomeWorkspaceState();
    state = reduceHomeWorkspaceState(state, { type: "setIdeaSheetOpen", open: true });

    expect(state.isIdeaSheetOpen).toBe(true);
  });
});
