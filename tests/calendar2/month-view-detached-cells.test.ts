import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Calendar2MonthView from "@/components/calendar2/Calendar2MonthView";
import { getMonthGridDates, toDateKey } from "@/components/calendar2/date-utils";
import type { CalendarEvent } from "@/lib/types";

describe("Calendar2MonthView detached cells", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-15T09:30:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders separated month cards with active glow states instead of the old table grid", () => {
    const anchorDate = new Date("2026-03-15T09:30:00.000Z");
    const days = getMonthGridDates(anchorDate);
    const dateKey = toDateKey(anchorDate);
    const events: CalendarEvent[] = [
      {
        id: "event-1",
        title: "Design review",
        description: "",
        date: dateKey,
        time: "11:00",
        type: "event",
      },
    ];

    const html = renderToStaticMarkup(
      React.createElement(Calendar2MonthView, {
        anchorDate,
        days,
        eventsByDate: { [dateKey]: events },
        eventPriorities: {},
        glowingCellKey: dateKey,
        onSelectDate: () => undefined,
        onSelectEvent: () => undefined,
        onQuickAdd: () => undefined,
        onMoveEvent: () => undefined,
      }),
    );

    expect(html).toContain('data-cal2-month-grid="detached"');
    expect(html).toContain('data-cal2-month-fit="viewport"');
    expect(html).toContain("gap-3");
    expect(html).toContain("grid-rows-[repeat(6,minmax(0,1fr))]");
    expect(html).toContain('data-cal2-month-cell-tone="active"');
    expect(html).toContain('data-cal2-glow-mode="pointer"');
    expect(html).toContain('data-cal2-glow-active="true"');
    expect(html).not.toContain("border-b border-r");
  });
});
