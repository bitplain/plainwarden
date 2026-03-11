import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import Calendar2Toolbar from "@/components/calendar2/Calendar2Toolbar";

describe("Calendar2 toolbar tabs", () => {
  it("renders AI-I as a standalone route before calendar while keeping the home AI link separate", () => {
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

    const aiIIndex = html.indexOf('href="/"');
    const calendarIndex = html.indexOf(">Календарь</button>");

    expect(aiIIndex).toBeGreaterThan(-1);
    expect(calendarIndex).toBeGreaterThan(-1);
    expect(aiIIndex).toBeLessThan(calendarIndex);
    expect(html).toContain(">AI-I</a>");
    expect(html).toContain('href="/ai"');
    expect(html).not.toContain(">Inbox<");
    expect(html).not.toContain(">AI-I</button>");
    expect(html).not.toContain(">AI</button>");
  });
});
