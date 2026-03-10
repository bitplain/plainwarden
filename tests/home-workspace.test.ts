import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import HomeWorkspace from "@/components/home/HomeWorkspace";
import { NetdenStoreProvider } from "@/lib/store";

vi.mock("@/lib/api", () => ({
  api: {
    me: vi.fn(),
    listInbox: vi.fn(),
    listTasks: vi.fn(),
    getDailyStats: vi.fn(),
    getWeeklyStats: vi.fn(),
    createInboxItem: vi.fn(),
    convertInboxItem: vi.fn(),
    archiveInboxItem: vi.fn(),
    analyzeInboxItem: vi.fn(),
    panicResetTasks: vi.fn(),
    listSubtasks: vi.fn(),
    updateTask: vi.fn(),
    createSubtask: vi.fn(),
    updateSubtask: vi.fn(),
    getEvents: vi.fn(),
    logout: vi.fn(),
  },
}));

describe("HomeWorkspace", () => {
  it("renders a single-surface home with one prompt bar and compact idea rail", () => {
    const html = renderToStaticMarkup(
      React.createElement(NetdenStoreProvider, {
        children: React.createElement(HomeWorkspace, {
          initialInputMode: "ai",
          initialAnchorDateKey: "2026-03-10",
        }),
      }),
    );

    expect(html).toContain("data-home-layout=\"single-surface\"");
    expect(html).toContain("data-home-prompt-bar=\"true\"");
    expect(html).toContain("data-home-idea-rail=\"compact\"");
    expect(html).toContain("AI home");
    expect(html).not.toContain("Quick Capture");
    expect(html).not.toContain("data-home-segmented-control");
    expect(html).not.toContain("data-home-rail=\"compact-context\"");
  });

  it("reflects the active idea mode inside the shared prompt bar", () => {
    const html = renderToStaticMarkup(
      React.createElement(NetdenStoreProvider, {
        children: React.createElement(HomeWorkspace, {
          initialInputMode: "idea",
          initialAnchorDateKey: "2026-03-10",
        }),
      }),
    );

    expect(html).toContain("data-home-input-mode=\"idea\"");
    expect(html).toContain("Все идеи");
  });
});
