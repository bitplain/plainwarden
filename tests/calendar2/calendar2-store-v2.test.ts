import { describe, expect, it } from "vitest";
import { syncTaskEventsToKanbanCards } from "@/components/calendar2/calendar2-store";
import type { CalendarEvent } from "@/lib/types";
import type { KanbanCard } from "@/components/calendar2/calendar2-types";

function makeEvent(overrides: Partial<CalendarEvent> = {}): CalendarEvent {
  return {
    id: "ev-1",
    title: "Test",
    description: "",
    date: "2026-03-01",
    type: "task",
    status: "pending",
    ...overrides,
  };
}

function makeCard(overrides: Partial<KanbanCard> = {}): KanbanCard {
  return {
    id: "card-1",
    title: "Test card",
    description: "",
    column: "backlog",
    priority: "medium",
    source: "event_sync",
    createdAt: "2026-03-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("syncTaskEventsToKanbanCards (v2 convert-related)", () => {
  it("converts done event to done column", () => {
    const event = makeEvent({ status: "done" });
    const result = syncTaskEventsToKanbanCards({
      cards: [],
      events: [event],
      priorities: {},
      now: "2026-03-01T00:00:00.000Z",
    });
    expect(result).toHaveLength(1);
    expect(result[0].column).toBe("done");
  });

  it("ignores non-task events", () => {
    const event = makeEvent({ type: "event" });
    const result = syncTaskEventsToKanbanCards({
      cards: [],
      events: [event],
      priorities: {},
    });
    expect(result).toHaveLength(0);
  });

  it("preserves manual cards linked to missing events", () => {
    const card = makeCard({ linkedEventId: "missing-id", source: "manual" });
    const result = syncTaskEventsToKanbanCards({
      cards: [card],
      events: [],
      priorities: {},
      removeStaleSyncedCards: true,
    });
    expect(result).toHaveLength(1);
  });

  it("removes stale synced cards linked to missing events", () => {
    const card = makeCard({ linkedEventId: "missing-id", source: "event_sync" });
    const result = syncTaskEventsToKanbanCards({
      cards: [card],
      events: [],
      priorities: {},
      removeStaleSyncedCards: true,
    });
    expect(result).toHaveLength(0);
  });
});
