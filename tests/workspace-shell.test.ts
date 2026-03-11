import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const usePathnameMock = vi.fn(() => "/");
const logoutMock = vi.fn(async () => undefined);

vi.mock("next/navigation", () => ({
  usePathname: () => usePathnameMock(),
}));

vi.mock("@/lib/store", () => ({
  useNetdenStore: (selector: (state: Record<string, unknown>) => unknown) =>
    selector({
      logout: logoutMock,
    }),
}));

import WorkspaceShell from "@/components/workspace/WorkspaceShell";

describe("WorkspaceShell", () => {
  beforeEach(() => {
    usePathnameMock.mockReset();
    usePathnameMock.mockReturnValue("/");
  });

  it("renders one shared nav order for workspace routes", () => {
    const html = renderToStaticMarkup(
      React.createElement(WorkspaceShell, {
        children: React.createElement("div", null, "Page body"),
      }),
    );

    const aiIIndex = html.indexOf(">AI-I<");
    const calendarIndex = html.indexOf(">Календарь<");
    const aiIndex = html.indexOf(">AI<");
    const kanbanIndex = html.indexOf(">Канбан<");
    const notesIndex = html.indexOf(">Заметки<");

    expect(html).toContain('data-workspace-shell="ai-i"');
    expect(html).toContain('href="/"');
    expect(html).toContain('href="/calendar"');
    expect(html).toContain('href="/kanban"');
    expect(html).toContain('href="/notes"');
    expect(html).toContain('href="/ai"');
    expect(aiIIndex).toBeLessThan(calendarIndex);
    expect(calendarIndex).toBeLessThan(aiIndex);
    expect(aiIndex).toBeLessThan(kanbanIndex);
    expect(kanbanIndex).toBeLessThan(notesIndex);
  });

  it("keeps the compact top-nav styling from the original main toolbar", () => {
    const html = renderToStaticMarkup(
      React.createElement(WorkspaceShell, {
        children: React.createElement("div", null, "Page body"),
      }),
    );

    expect(html).toContain(
      "inline-flex flex-wrap rounded-[6px] border border-[var(--cal2-border)] bg-[var(--cal2-surface-2)] p-0.5",
    );
    expect(html).toContain("rounded-[4px] px-2.5 py-1.5 text-[11px] font-medium leading-[1.2]");
    expect(html).toContain("rounded-[6px] border border-[var(--cal2-border)] bg-[var(--cal2-surface-2)]");
  });

  it("marks the standalone kanban route as active", () => {
    usePathnameMock.mockReturnValue("/kanban");

    const html = renderToStaticMarkup(
      React.createElement(WorkspaceShell, {
        children: React.createElement("div", null, "Page body"),
      }),
    );

    expect(html).toContain('data-workspace-shell="kanban"');
    expect(html).toContain('data-workspace-top-nav="kanban"');
  });
});
