import { describe, expect, it } from "vitest";
import { syncTaskEventsToKanbanCards } from "@/components/calendar2/calendar2-store";
import type { KanbanCard } from "@/components/calendar2/calendar2-types";
import type { CalendarEvent } from "@/lib/types";

function makeTaskEvent(input: {
  id: string;
  title: string;
  description: string;
  status?: "pending" | "done";
}): CalendarEvent {
  return {
    id: input.id,
    title: input.title,
    description: input.description,
    date: "2026-03-01",
    type: "task",
    status: input.status,
  };
}

describe("syncTaskEventsToKanbanCards", () => {
  it("creates kanban cards for task events", () => {
    const cards: KanbanCard[] = [];
    const events: CalendarEvent[] = [
      makeTaskEvent({ id: "task-1", title: "Deploy", description: "Ship release" }),
      {
        id: "event-1",
        title: "Demo",
        description: "Client demo",
        date: "2026-03-01",
        type: "event",
      },
    ];

    const result = syncTaskEventsToKanbanCards({
      cards,
      events,
      priorities: { "task-1": "high" },
      now: "2026-03-01T10:00:00.000Z",
    });

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      title: "Deploy",
      description: "Ship release",
      linkedEventId: "task-1",
      source: "event_sync",
      priority: "high",
      column: "backlog",
      createdAt: "2026-03-01T10:00:00.000Z",
    });
  });

  it("updates existing linked card and removes duplicates", () => {
    const cards: KanbanCard[] = [
      {
        id: "c1",
        title: "Old title",
        description: "Old description",
        column: "backlog",
        priority: "low",
        linkedEventId: "task-2",
        source: "event_sync",
        createdAt: "2026-02-28T10:00:00.000Z",
      },
      {
        id: "c2",
        title: "Duplicate",
        description: "Duplicate",
        column: "review",
        priority: "medium",
        linkedEventId: "task-2",
        source: "event_sync",
        createdAt: "2026-02-28T10:01:00.000Z",
      },
      {
        id: "manual-1",
        title: "Manual",
        description: "Manual card",
        column: "review",
        priority: "medium",
        createdAt: "2026-02-28T10:02:00.000Z",
        source: "manual",
      },
    ];

    const result = syncTaskEventsToKanbanCards({
      cards,
      events: [
        makeTaskEvent({
          id: "task-2",
          title: "Updated title",
          description: "Updated description",
          status: "done",
        }),
      ],
      priorities: { "task-2": "urgent" },
    });

    const linked = result.filter((card) => card.linkedEventId === "task-2");
    expect(linked).toHaveLength(1);
    expect(linked[0]).toMatchObject({
      title: "Updated title",
      description: "Updated description",
      priority: "urgent",
      column: "done",
      source: "event_sync",
    });
    expect(result.some((card) => card.id === "manual-1")).toBe(true);
  });

  it("keeps manual card column for pending task", () => {
    const cards: KanbanCard[] = [
      {
        id: "manual-linked",
        title: "Task before rename",
        description: "Task before update",
        column: "in_progress",
        priority: "low",
        linkedEventId: "task-3",
        source: "manual",
        createdAt: "2026-02-28T10:00:00.000Z",
      },
    ];

    const result = syncTaskEventsToKanbanCards({
      cards,
      events: [
        makeTaskEvent({
          id: "task-3",
          title: "Task renamed",
          description: "Task updated",
          status: "pending",
        }),
      ],
      priorities: { "task-3": "high" },
    });

    expect(result[0]).toMatchObject({
      title: "Task renamed",
      description: "Task updated",
      column: "in_progress",
      priority: "high",
      source: "manual",
    });
  });

  it("removes stale auto-synced cards when task no longer exists", () => {
    const cards: KanbanCard[] = [
      {
        id: "synced-1",
        title: "From event",
        description: "From event",
        column: "backlog",
        priority: "medium",
        linkedEventId: "old-task",
        source: "event_sync",
        createdAt: "2026-02-28T10:00:00.000Z",
      },
      {
        id: "manual-linked",
        title: "Manual linked",
        description: "Manual linked",
        column: "review",
        priority: "high",
        linkedEventId: "old-task",
        source: "manual",
        createdAt: "2026-02-28T10:01:00.000Z",
      },
    ];

    const result = syncTaskEventsToKanbanCards({
      cards,
      events: [],
      priorities: {},
    });

    expect(result.map((card) => card.id)).toEqual(["manual-linked"]);
  });

  it("keeps stale auto-synced cards when remove flag is disabled", () => {
    const cards: KanbanCard[] = [
      {
        id: "synced-1",
        title: "From event",
        description: "From event",
        column: "backlog",
        priority: "medium",
        linkedEventId: "filtered-task",
        source: "event_sync",
        createdAt: "2026-02-28T10:00:00.000Z",
      },
    ];

    const result = syncTaskEventsToKanbanCards({
      cards,
      events: [],
      priorities: {},
      removeStaleSyncedCards: false,
    });

    expect(result).toBe(cards);
  });
});
