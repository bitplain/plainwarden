import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/components/ai-chat/AiChatProvider", () => ({
  useAiChatRuntime: (selector: (state: Record<string, unknown>) => unknown) =>
    selector({
      messages: [],
      pendingAction: null,
      isStreaming: false,
      inputValue: "",
      setInputValue: () => undefined,
    }),
  useAiChatRuntimeActions: () => ({
    submitCurrentInput: vi.fn(),
    resolvePendingAction: vi.fn(),
  }),
}));

vi.mock("@/components/ai-theme", () => ({
  readAiTheme: () => "ambient",
  subscribeAiTheme: () => () => undefined,
}));

vi.mock("@/components/ai-chat/AiIChatSurface", () => ({
  default: () => React.createElement("div", { "data-ai-i-surface": "mock" }, "AI-I Surface"),
}));

import AiIStandalonePage from "@/components/ai-chat/AiIStandalonePage";

describe("AiIStandalonePage", () => {
  it("renders only the ai-i content surface because the shared shell owns the header", () => {
    const html = renderToStaticMarkup(React.createElement(AiIStandalonePage));

    expect(html).toContain('data-ai-i-page="standalone"');
    expect(html).toContain('data-ai-i-stage="centered"');
    expect(html).not.toContain('data-workspace-top-nav="ai-i"');
    expect(html).not.toContain('href="/ai-i"');
    expect(html).not.toContain('href="/calendar"');
    expect(html).toContain("AI-I Surface");
  });
});
