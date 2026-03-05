import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import ProgressSummaryCard from "@/components/calendar2/ProgressSummaryCard";

describe("ProgressSummaryCard", () => {
  it("renders daily and weekly metrics", () => {
    const html = renderToStaticMarkup(
      React.createElement(ProgressSummaryCard, {
        daily: {
          date: "2026-03-05",
          tasksCompleted: 3,
          overdueCount: 1,
          priorityPlanned: 2,
          focusMinutes: 0,
          habitsCompleted: 0,
        },
        weekly: {
          weekStart: "2026-03-02",
          weekEnd: "2026-03-08",
          tasksCompleted: 11,
          overdueCount: 4,
          focusMinutes: 0,
          habitsCompleted: 0,
        },
      }),
    );

    expect(html).toContain("Progress");
    expect(html).toContain("11");
    expect(html).toContain("3");
  });
});
