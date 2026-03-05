import { describe, expect, it, vi } from "vitest";
import type { CalendarEvent } from "@/lib/types";
import {
  findNextPreciseReminderCandidate,
  triggerDuePreciseReminders,
} from "@/components/calendar2/usePreciseReminderTick";

function makeEvent(overrides: Partial<CalendarEvent>): CalendarEvent {
  return {
    id: "evt-1",
    title: "3333",
    description: "",
    date: "2026-03-05",
    time: "16:53",
    type: "event",
    status: "pending",
    ...overrides,
  };
}

describe("calendar2 precise reminder tick", () => {
  it("finds nearest pending timed event for today", () => {
    const now = new Date("2026-03-05T13:52:00.000Z");
    const fired = new Set<string>();
    const candidate = findNextPreciseReminderCandidate({
      events: [makeEvent({ id: "evt-1", time: "16:53" }), makeEvent({ id: "evt-2", time: "16:54" })],
      firedSessionKeys: fired,
      now,
      timeZone: "Europe/Moscow",
    });

    expect(candidate).not.toBeNull();
    expect(candidate?.event.id).toBe("evt-1");
  });

  it("fires in-app notification and tick API exactly once per session key", async () => {
    const fired = new Set<string>();
    const addNotification = vi.fn();
    const fetchFn = vi.fn(async () => new Response(JSON.stringify({ ok: true }), { status: 200 }));
    const events = [makeEvent({ id: "evt-3333", time: "16:53" })];
    const now = new Date("2026-03-05T13:53:00.000Z");

    const first = await triggerDuePreciseReminders({
      events,
      firedSessionKeys: fired,
      addNotification,
      isAuthenticated: true,
      now,
      timeZone: "Europe/Moscow",
      fetchFn,
    });

    expect(first.fired).toBe(1);
    expect(addNotification).toHaveBeenCalledTimes(1);
    expect(addNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: "reminder",
        eventId: "evt-3333",
      }),
    );
    expect(fetchFn).toHaveBeenCalledTimes(1);
    expect(fetchFn).toHaveBeenCalledWith(
      "/api/agent/reminders/tick",
      expect.objectContaining({
        method: "POST",
      }),
    );

    const second = await triggerDuePreciseReminders({
      events,
      firedSessionKeys: fired,
      addNotification,
      isAuthenticated: true,
      now,
      timeZone: "Europe/Moscow",
      fetchFn,
    });

    expect(second.fired).toBe(0);
    expect(addNotification).toHaveBeenCalledTimes(1);
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });
});
