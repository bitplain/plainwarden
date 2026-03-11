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

  it("keeps the old full-width workspace frame instead of a centered canvas", () => {
    const html = renderToStaticMarkup(
      React.createElement(WorkspaceShell, {
        children: React.createElement("div", null, "Page body"),
      }),
    );

    expect(html).toContain('data-workspace-shell="ai-i"');
    expect(html).toContain('data-workspace-top-nav="ai-i"');
    expect(html).toContain("flex h-dvh flex-col bg-[var(--cal2-bg)]");
    expect(html).not.toContain("max-w-[1280px]");
    expect(html).not.toContain("mx-auto");
  });

  it("renders the old toolbar visual contract in the shared header", () => {
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

    expect(html).toContain(">Настройки<");
    expect(html).toContain(">Календарь 2.0<");
    expect(html).toContain(">Выйти<");
    expect(html).toContain(
      "inline-flex rounded-[6px] border border-[var(--cal2-border)] bg-[var(--cal2-surface-2)] p-0.5",
    );
    expect(aiIIndex).toBeLessThan(calendarIndex);
    expect(calendarIndex).toBeLessThan(aiIndex);
    expect(aiIndex).toBeLessThan(kanbanIndex);
    expect(kanbanIndex).toBeLessThan(notesIndex);
  });
});
