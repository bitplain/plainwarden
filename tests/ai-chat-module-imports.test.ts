import { describe, expect, test } from "vitest";

describe("ai chat modules", () => {
  test("imports AiChatPanel without syntax errors", async () => {
    const module = await import("@/components/ai-chat/AiChatPanel");

    expect(typeof module.default).toBe("function");
  });

  test("imports AiChatWidget without duplicate declarations", async () => {
    const module = await import("@/components/AiChatWidget");

    expect(typeof module.default).toBe("function");
  });
});
