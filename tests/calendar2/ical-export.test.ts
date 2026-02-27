import { describe, expect, it } from "vitest";
import { buildIcsCalendar } from "@/lib/server/ical";
import type { CalendarEvent } from "@/lib/types";

describe("buildIcsCalendar", () => {
  it("builds calendar payload with all-day and timed events", () => {
    const events: CalendarEvent[] = [
      {
        id: "event-1",
        title: "Design, Review",
        description: "Line 1\nLine 2",
        date: "2026-03-10",
        type: "event",
        status: "pending",
      },
      {
        id: "task-1",
        title: "Daily standup",
        description: "",
        date: "2026-03-11",
        time: "09:30",
        type: "task",
        status: "done",
      },
    ];

    const ics = buildIcsCalendar(events, {
      now: new Date("2026-03-01T12:00:00.000Z"),
      calendarName: "Team; Calendar",
    });

    expect(ics.startsWith("BEGIN:VCALENDAR\r\n")).toBe(true);
    expect(ics.endsWith("\r\n")).toBe(true);
    expect(ics).toContain("X-WR-CALNAME:Team\\; Calendar");
    expect(ics).toContain("DTSTAMP:20260301T120000Z");
    expect(ics).toContain("UID:event-1@plainwarden.local");
    expect(ics).toContain("DTSTART;VALUE=DATE:20260310");
    expect(ics).toContain("DTEND;VALUE=DATE:20260311");
    expect(ics).toContain("SUMMARY:Design\\, Review");
    expect(ics).toContain("DESCRIPTION:Line 1\\nLine 2");
    expect(ics).toContain("DTSTART:20260311T093000");
    expect(ics).toContain("DTEND:20260311T103000");
    expect(ics).toContain("CATEGORIES:TASK");
    expect(ics).toContain("END:VCALENDAR");
  });
});
