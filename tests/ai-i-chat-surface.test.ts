import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { AgentActionProposal } from "@/agent/types";
import AiIChatSurface from "@/components/ai-chat/AiIChatSurface";

const pendingAction: AgentActionProposal = {
  id: "action-1",
  toolName: "calendar.move",
  arguments: {
    date: "2026-03-12",
  },
  summary: "Перенести событие на завтра",
  createdAt: "2026-03-10T12:00:00.000Z",
  expiresAt: "2026-03-10T13:00:00.000Z",
};

describe("AiIChatSurface", () => {
  it("renders the empty immersive composer shell", () => {
    const html = renderToStaticMarkup(
      React.createElement(AiIChatSurface, {
        messages: [],
        pendingAction: null,
        isStreaming: false,
        inputValue: "",
        onInputChange: vi.fn(),
        onSubmit: vi.fn(),
        onResolveAction: vi.fn(),
      }),
    );

    expect(html).toContain("Type your message here...");
    expect(html).toContain("Search");
    expect(html).toContain("Think");
    expect(html).toContain("Canvas");
    expect(html).toContain("Voice message");
  });

  it("keeps transcript and pending action inside the new visual shell", () => {
    const html = renderToStaticMarkup(
      React.createElement(AiIChatSurface, {
        messages: [
          {
            id: "user-1",
            role: "user",
            text: "Спланируй мне день",
          },
          {
            id: "assistant-1",
            role: "assistant",
            text: "Вот оптимальный план дня.",
          },
        ],
        pendingAction,
        isStreaming: false,
        inputValue: "Готово к отправке",
        onInputChange: vi.fn(),
        onSubmit: vi.fn(),
        onResolveAction: vi.fn(),
      }),
    );

    expect(html).toContain("Спланируй мне день");
    expect(html).toContain("Вот оптимальный план дня.");
    expect(html).toContain("Перенести событие на завтра");
    expect(html).toContain("Подтвердить");
    expect(html).toContain("Отклонить");
  });
});
