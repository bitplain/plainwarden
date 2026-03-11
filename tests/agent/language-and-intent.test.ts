import { describe, expect, it } from "vitest";
import { classifyUserIntent, selectRelevantModules } from "@/agent/intent";
import { detectLanguageCode } from "@/hooks/useLanguageDetect";

describe("agent language detection", () => {
  it("detects russian text", () => {
    expect(detectLanguageCode("Какие задачи у меня завтра?")).toBe("ru");
  });

  it("detects english text", () => {
    expect(detectLanguageCode("Show me tasks due next week")).toBe("en");
  });
});

describe("agent intent classification", () => {
  it("classifies info request", () => {
    const intent = classifyUserIntent("Какие задачи у меня завтра?");
    expect(intent.type).toBe("query");
  });

  it("classifies mutation request", () => {
    const intent = classifyUserIntent("Создай заметку с названием План релиза");
    expect(intent.type).toBe("action");
    expect(intent.actionKind).toBe("create");
  });

  it("classifies navigation request", () => {
    const intent = classifyUserIntent("Open kanban board");
    expect(intent.type).toBe("navigate");
    expect(intent.navigateTo).toBe("/kanban");
  });

  it("maps query to multiple modules", () => {
    const modules = selectRelevantModules("Покажи задачи на завтра и связанные заметки");
    expect(modules).toContain("calendar");
    expect(modules).toContain("notes");
  });
});
