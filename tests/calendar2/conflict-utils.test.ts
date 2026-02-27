import { describe, expect, it } from "vitest";
import type { CalendarEvent } from "@/lib/types";
import { findTimeConflicts } from "@/components/calendar2/conflict-utils";

function createEvent(overrides: Partial<CalendarEvent>): CalendarEvent {
  return {
    id: overrides.id ?? "event-1",
    title: overrides.title ?? "Event",
    description: overrides.description ?? "",
    date: overrides.date ?? "2026-02-27",
    time: overrides.time,
    type: overrides.type ?? "event",
    status: overrides.status ?? "pending",
  };
}

describe("findTimeConflicts", () => {
  it("returns conflicts for events with the same date and time", () => {
    const events: CalendarEvent[] = [
      createEvent({ id: "a", title: "Standup", date: "2026-02-27", time: "10:00" }),
      createEvent({ id: "b", title: "Design review", date: "2026-02-27", time: "12:00" }),
    ];

    const conflicts = findTimeConflicts(events, {
      date: "2026-02-27",
      time: "10:00",
    });

    expect(conflicts).toEqual([events[0]]);
  });

  it("does not return conflicts for events with different time", () => {
    const events: CalendarEvent[] = [
      createEvent({ id: "a", date: "2026-02-27", time: "10:00" }),
    ];

    const conflicts = findTimeConflicts(events, {
      date: "2026-02-27",
      time: "11:00",
    });

    expect(conflicts).toEqual([]);
  });

  it("ignores the edited event itself", () => {
    const events: CalendarEvent[] = [
      createEvent({ id: "a", title: "Standup", date: "2026-02-27", time: "10:00" }),
      createEvent({ id: "b", title: "Sync", date: "2026-02-27", time: "10:00" }),
    ];

    const conflicts = findTimeConflicts(events, {
      date: "2026-02-27",
      time: "10:00",
      excludeEventId: "a",
    });

    expect(conflicts).toEqual([events[1]]);
  });

  it("returns empty list when candidate time is not set", () => {
    const events: CalendarEvent[] = [
      createEvent({ id: "a", date: "2026-02-27", time: "10:00" }),
    ];

    const conflicts = findTimeConflicts(events, {
      date: "2026-02-27",
      time: "",
    });

    expect(conflicts).toEqual([]);
  });
});
