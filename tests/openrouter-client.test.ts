import { describe, expect, it } from "vitest";
import { normalizeOpenRouterModels } from "@/lib/server/openrouter-client";

describe("normalizeOpenRouterModels", () => {
  it("extracts id and display name", () => {
    const result = normalizeOpenRouterModels({
      data: [
        { id: "openai/gpt-4o-mini", name: "GPT-4o mini" },
        { id: "anthropic/claude-3.5-sonnet", name: "Claude 3.5 Sonnet" },
      ],
    });

    expect(result).toEqual([
      { id: "anthropic/claude-3.5-sonnet", label: "Claude 3.5 Sonnet" },
      { id: "openai/gpt-4o-mini", label: "GPT-4o mini" },
    ]);
  });

  it("falls back to id when name absent", () => {
    const result = normalizeOpenRouterModels({
      data: [{ id: "openai/gpt-4o-mini" }],
    });

    expect(result).toEqual([{ id: "openai/gpt-4o-mini", label: "openai/gpt-4o-mini" }]);
  });

  it("returns empty list for invalid shape", () => {
    expect(normalizeOpenRouterModels({})).toEqual([]);
  });
});
