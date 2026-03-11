import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import Calendar2Toolbar from "@/components/calendar2/Calendar2Toolbar";

describe("Calendar2 toolbar tabs", () => {
  it("renders only calendar-specific controls because workspace nav moved to the shared shell", () => {
    const html = renderToStaticMarkup(
      React.createElement(Calendar2Toolbar, {
        currentView: "month",
        periodLabel: "Март 2026",
        onViewChange: () => undefined,
        onPrev: () => undefined,
        onNext: () => undefined,
        onToday: () => undefined,
        onAdd: () => undefined,
        onQuickCapture: () => undefined,
        onToggleSidebar: () => undefined,
        isSidebarVisible: true,
        searchValue: "",
        onSearchChange: () => undefined,
      }),
    );

    expect(html).toContain("Quick Capture");
    expect(html).toContain("Март 2026");
    expect(html).toContain("Скрыть панель");
    expect(html).toContain("Поиск");
    expect(html).not.toContain("AI-I");
    expect(html).not.toContain("data-workspace-top-nav");
  });
});
