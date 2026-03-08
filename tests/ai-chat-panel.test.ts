import { describe, expect, test } from "vitest";
import {
  getAiChatSuggestions,
  getAiScrollBehavior,
  getAiWidgetToggleState,
} from "@/components/ai-chat/constants";

describe("getAiChatSuggestions", () => {
  test("returns shared general prompts for floating widget", () => {
    const suggestions = getAiChatSuggestions("floating");

    expect(suggestions).toHaveLength(3);
    expect(suggestions.map((item) => item.id)).toEqual([
      "tomorrow",
      "week",
      "capture",
    ]);
  });

  test("returns calendar-focused prompts for embedded panel", () => {
    const suggestions = getAiChatSuggestions("embedded");

    expect(suggestions).toHaveLength(3);
    expect(suggestions.some((item) => item.id === "capture")).toBe(false);
    expect(suggestions.map((item) => item.id)).toEqual([
      "focus",
      "deadlines",
      "rebalance",
    ]);
  });
});

describe("getAiScrollBehavior", () => {
  test("uses instant scroll while assistant is streaming", () => {
    expect(getAiScrollBehavior({ hasMessages: true, isStreaming: true })).toBe("auto");
  });

  test("uses smooth scroll only for settled message updates", () => {
    expect(getAiScrollBehavior({ hasMessages: true, isStreaming: false })).toBe("smooth");
  });

  test("does not animate when there is no chat history yet", () => {
    expect(getAiScrollBehavior({ hasMessages: false, isStreaming: false })).toBe("auto");
  });
});

describe("getAiWidgetToggleState", () => {
  test("keeps the active chip when opening the widget", () => {
    expect(
      getAiWidgetToggleState({
        isOpen: false,
        activeChipId: "calendar",
      }),
    ).toEqual({
      isOpen: true,
      activeChipId: "calendar",
    });
  });

  test("resets the active chip when closing the widget", () => {
    expect(
      getAiWidgetToggleState({
        isOpen: true,
        activeChipId: "calendar",
      }),
    ).toEqual({
      isOpen: false,
      activeChipId: null,
    });
  });
});
