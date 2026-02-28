import { describe, expect, it } from "vitest";
import type { CalendarEvent, KanbanCard, Note } from "@/lib/types";
import { buildUnifiedContext } from "@/utils/contextBuilder";

const events: CalendarEvent[] = [
  {
    id: "evt-1",
    title: "Подготовить демо",
    description: "demo",
    date: "2026-03-01",
    type: "task",
    status: "pending",
  },
];

const cards: KanbanCard[] = [
  {
    id: "card-1",
    boardId: "b-1",
    columnId: "c-1",
    userId: "u-1",
    title: "Подготовить демо",
    description: "same",
    position: 1,
    createdAt: "2026-02-20T00:00:00.000Z",
    updatedAt: "2026-02-20T00:00:00.000Z",
    eventLinks: ["evt-1"],
  },
];

const notes: Note[] = [
  {
    id: "note-1",
    userId: "u-1",
    title: "Demo notes",
    body: "todo",
    tags: ["demo"],
    createdAt: "2026-02-20T00:00:00.000Z",
    updatedAt: "2026-02-20T00:00:00.000Z",
    eventLinks: ["evt-1"],
  },
];

describe("buildUnifiedContext", () => {
  it("unifies linked entities by global id", () => {
    const context = buildUnifiedContext({ events, cards, notes, daily: [] });
    const linked = context.entities.find((entity) => entity.globalEntityId === "event:evt-1");

    expect(linked).toBeDefined();
    expect(linked?.sources).toContain("calendar");
    expect(linked?.sources).toContain("kanban");
    expect(linked?.sources).toContain("notes");
  });

  it("limits snippet size for llm payload", () => {
    const context = buildUnifiedContext({ events, cards, notes, daily: [] }, { maxChars: 120 });
    expect(context.promptFragment.length).toBeLessThanOrEqual(120);
  });
});
