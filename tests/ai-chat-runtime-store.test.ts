import { describe, expect, it, vi } from "vitest";
import type { AgentMemoryItem } from "@/agent/types";
import { createAiChatRuntimeStore } from "@/components/ai-chat/runtime-store";

function createSseResponse(packets: string[]): Response {
  const encoder = new TextEncoder();

  return new Response(
    new ReadableStream({
      start(controller) {
        for (const packet of packets) {
          controller.enqueue(encoder.encode(packet));
        }
        controller.close();
      },
    }),
    {
      status: 200,
      headers: {
        "Content-Type": "text/event-stream",
      },
    },
  );
}

describe("createAiChatRuntimeStore", () => {
  it("streams assistant output and preserves message history across sends", async () => {
    const fetchFn = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        createSseResponse([
          'event: token\ndata: {"text":"Первый ответ"}\n\n',
          'event: action\ndata: {"payload":{"id":"action-1","toolName":"calendar.move","arguments":{"date":"2026-03-12"},"summary":"Перенести событие","createdAt":"2026-03-10T12:00:00.000Z","expiresAt":"2026-03-10T13:00:00.000Z"}}\n\n',
        ]),
      )
      .mockResolvedValueOnce(
        createSseResponse([
          'event: token\ndata: {"text":"Второй ответ"}\n\n',
        ]),
      );

    const store = createAiChatRuntimeStore({
      fetchFn,
      sessionId: "session-1",
    });
    const memory: AgentMemoryItem[] = [];

    await store.getState().sendMessage("Первый вопрос", memory);
    await store.getState().sendMessage("Второй вопрос", memory);

    const state = store.getState();

    expect(state.messages.map((message) => `${message.role}:${message.text}`)).toEqual([
      "user:Первый вопрос",
      "assistant:Первый ответ",
      "user:Второй вопрос",
      "assistant:Второй ответ",
    ]);
    expect(state.pendingAction?.summary).toBe("Перенести событие");
    expect(state.isStreaming).toBe(false);
  });

  it("keeps shared composer state in sync for chip toggles and manual input", () => {
    const store = createAiChatRuntimeStore({
      fetchFn: vi.fn<typeof fetch>(),
      sessionId: "session-2",
    });

    store.getState().toggleChip("calendar", "Расскажи про календарь");
    expect(store.getState().activeChipId).toBe("calendar");
    expect(store.getState().inputValue).toBe("Расскажи про календарь");

    store.getState().setInputValue("Ручной ввод");
    expect(store.getState().activeChipId).toBeNull();
    expect(store.getState().inputValue).toBe("Ручной ввод");

    store.getState().selectSuggestion("Покажи неделю");
    expect(store.getState().activeChipId).toBeNull();
    expect(store.getState().inputValue).toBe("Покажи неделю");

    store.getState().clearComposer();
    expect(store.getState().inputValue).toBe("");
  });
});
