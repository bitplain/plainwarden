import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const redirectMock = vi.fn((url: string) => {
  throw new Error(`REDIRECT:${url}`);
});
const homeWorkspaceMock = vi.fn((props: Record<string, unknown>) =>
  React.createElement("main", { "data-home-workspace": "mock", "data-home-props": JSON.stringify(props) }, "Home Workspace"),
);
const calendarWorkspaceMock = vi.fn((props: Record<string, unknown>) =>
  React.createElement("main", { "data-calendar-workspace": "mock", "data-calendar-props": JSON.stringify(props) }, "Calendar Workspace"),
);

vi.mock("next/navigation", () => ({
  redirect: (url: string) => redirectMock(url),
}));

vi.mock("@/components/home/HomeWorkspace", () => ({
  default: (props: Record<string, unknown>) => homeWorkspaceMock(props),
}));

vi.mock("@/components/calendar2/Calendar2", () => ({
  default: (props: Record<string, unknown>) => calendarWorkspaceMock(props),
}));

vi.mock("@/components/ai-chat/AiIStandalonePage", () => ({
  default: () => React.createElement("main", { "data-ai-i-workspace": "mock" }, "AI-I Workspace"),
}));

import RootPage from "@/app/(workspace)/page";
import AiPage from "@/app/(workspace)/ai/page";
import AiILegacyPage from "@/app/ai-i/page";
import CalendarPage from "@/app/(workspace)/calendar/page";
import KanbanPage from "@/app/(workspace)/kanban/page";
import NotesPage from "@/app/(workspace)/notes/page";

describe("workspace routes", () => {
  beforeEach(() => {
    redirectMock.mockClear();
    homeWorkspaceMock.mockClear();
    calendarWorkspaceMock.mockClear();
  });

  it("renders AI-I on /", async () => {
    const page = await RootPage();
    const html = renderToStaticMarkup(page);

    expect(html).toContain("AI-I Workspace");
    expect(redirectMock).not.toHaveBeenCalled();
  });

  it("renders the legacy ai home on /ai", async () => {
    const page = await AiPage({
      searchParams: Promise.resolve({}),
    } as never);
    const html = renderToStaticMarkup(page);

    expect(html).toContain("Home Workspace");
    expect(homeWorkspaceMock.mock.calls[0]?.[0]).toMatchObject({
      initialInputMode: "ai",
      shouldCanonicalizeLegacyQuery: false,
    });
  });

  it("redirects /ai-i to the canonical root route", async () => {
    expect(() => AiILegacyPage()).toThrow("REDIRECT:/");
  });

  it("redirects legacy inbox tab requests to /ai?segment=inbox", async () => {
    await expect(
      CalendarPage({
        searchParams: Promise.resolve({ tab: "inbox" }),
      } as never),
    ).rejects.toThrow("REDIRECT:/ai?segment=inbox");
  });

  it("redirects legacy ai tab requests to /ai?segment=ai", async () => {
    await expect(
      CalendarPage({
        searchParams: Promise.resolve({ tab: "ai" }),
      } as never),
    ).rejects.toThrow("REDIRECT:/ai?segment=ai");
  });

  it("redirects legacy ai-i tab requests to /", async () => {
    await expect(
      CalendarPage({
        searchParams: Promise.resolve({ tab: "ai-i" }),
      } as never),
    ).rejects.toThrow("REDIRECT:/");
  });

  it("redirects legacy kanban tab requests to /kanban", async () => {
    await expect(
      CalendarPage({
        searchParams: Promise.resolve({ tab: "kanban" }),
      } as never),
    ).rejects.toThrow("REDIRECT:/kanban");
  });

  it("redirects legacy notes tab requests to /notes", async () => {
    await expect(
      CalendarPage({
        searchParams: Promise.resolve({ tab: "notes" }),
      } as never),
    ).rejects.toThrow("REDIRECT:/notes");
  });

  it("renders the calendar workspace on /calendar", async () => {
    const page = await CalendarPage({
      searchParams: Promise.resolve({}),
    } as never);
    const html = renderToStaticMarkup(page);

    expect(html).toContain("Calendar Workspace");
    expect(calendarWorkspaceMock.mock.calls[0]?.[0]).toMatchObject({
      section: "calendar",
    });
  });

  it("renders the standalone kanban workspace on /kanban", async () => {
    const page = await KanbanPage();
    const html = renderToStaticMarkup(page);

    expect(html).toContain("Calendar Workspace");
    expect(calendarWorkspaceMock.mock.calls[0]?.[0]).toMatchObject({
      section: "kanban",
    });
  });

  it("renders the standalone notes workspace on /notes", async () => {
    const page = await NotesPage();
    const html = renderToStaticMarkup(page);

    expect(html).toContain("Calendar Workspace");
    expect(calendarWorkspaceMock.mock.calls[0]?.[0]).toMatchObject({
      section: "notes",
    });
  });
});
