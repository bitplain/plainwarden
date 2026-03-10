import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import Calendar2Toolbar from "@/components/calendar2/Calendar2Toolbar";

describe("Calendar2 toolbar tabs", () => {
  it("renders only calendar-centric tabs", () => {
    const html = renderToStaticMarkup(
      React.createElement(Calendar2Toolbar, {
        activeTab: "calendar",
        onTabChange: () => undefined,
        currentView: "month",
        periodLabel: "Март 2026",
        onViewChange: () => undefined,
        onPrev: () => undefined,
        onNext: () => undefined,
        onToday: () => undefined,
        onAdd: () => undefined,
        onQuickCapture: () => undefined,
        onLogout: () => undefined,
        onToggleSidebar: () => undefined,
        isSidebarVisible: true,
        searchValue: "",
        onSearchChange: () => undefined,
      }),
    );

    expect(html).toContain("Календарь");
    expect(html).toContain(">AI<");
    expect(html).toContain('href="/"');
    expect(html).toContain("Канбан");
    expect(html).toContain("Заметки");
    expect(html).not.toContain(">Inbox<");
    expect(html).toContain("Quick Capture");
  });
});
