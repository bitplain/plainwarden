import { describe, expect, it } from "vitest";
import {
  InboxAiAnalysisError,
  normalizeInboxAiAnalysisPayload,
  parseInboxAiResponse,
} from "@/lib/server/inbox-ai";

describe("inbox ai payload normalization", () => {
  it("keeps a valid target and structured suggestion fields", () => {
    expect(
      normalizeInboxAiAnalysisPayload("inbox-1", {
        summary: "Это похоже на событие.",
        recommendedTarget: "event",
        rationale: ["Есть явная дата."],
        suggestedDate: "2026-03-10",
      }),
    ).toEqual({
      itemId: "inbox-1",
      summary: "Это похоже на событие.",
      recommendedTarget: "event",
      rationale: ["Есть явная дата."],
      suggestedDate: "2026-03-10",
    });
  });

  it("falls back to keep when model returns an unknown target", () => {
    expect(
      normalizeInboxAiAnalysisPayload("inbox-1", {
        summary: "Лучше пока не трогать.",
        recommendedTarget: "later",
        rationale: ["Недостаточно сигнала."],
      }),
    ).toEqual({
      itemId: "inbox-1",
      summary: "Лучше пока не трогать.",
      recommendedTarget: "keep",
      rationale: ["Недостаточно сигнала."],
    });
  });

  it("drops impossible calendar dates and trims rationale to two items", () => {
    expect(
      normalizeInboxAiAnalysisPayload("inbox-1", {
        summary: "Это больше похоже на задачу.",
        recommendedTarget: "task",
        rationale: ["Есть действие.", "Нет точного времени.", "Лишний пункт."],
        suggestedDate: "2026-02-31",
        suggestedDueDate: "2026-03-11",
        suggestedPriority: true,
      }),
    ).toEqual({
      itemId: "inbox-1",
      summary: "Это больше похоже на задачу.",
      recommendedTarget: "task",
      rationale: ["Есть действие.", "Нет точного времени."],
      suggestedDueDate: "2026-03-11",
      suggestedPriority: true,
    });
  });
});

describe("inbox ai response parsing", () => {
  it("parses JSON-only model output", () => {
    expect(
      parseInboxAiResponse("inbox-1", JSON.stringify({
        summary: "Сделайте из этого заметку.",
        recommendedTarget: "note",
        rationale: ["Это справочная мысль."],
      })),
    ).toEqual({
      itemId: "inbox-1",
      summary: "Сделайте из этого заметку.",
      recommendedTarget: "note",
      rationale: ["Это справочная мысль."],
    });
  });

  it("throws a controlled error on empty or broken model output", () => {
    expect(() => parseInboxAiResponse("inbox-1", "")).toThrow(InboxAiAnalysisError);
    expect(() => parseInboxAiResponse("inbox-1", "{")).toThrow(InboxAiAnalysisError);
  });
});
