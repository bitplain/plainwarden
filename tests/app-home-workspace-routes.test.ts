import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const redirectMock = vi.fn((url: string) => {
  throw new Error(`REDIRECT:${url}`);
});
const homeWorkspaceMock = vi.fn((props: Record<string, unknown>) =>
  React.createElement("main", { "data-home-workspace": "mock", "data-home-props": JSON.stringify(props) }, "Home Workspace"),
);

vi.mock("next/navigation", () => ({
  redirect: (url: string) => redirectMock(url),
}));

vi.mock("@/components/home/HomeWorkspace", () => ({
  default: (props: Record<string, unknown>) => homeWorkspaceMock(props),
}));

vi.mock("@/components/calendar2/Calendar2", () => ({
  default: (props: Record<string, unknown>) =>
    React.createElement(
      "main",
      { "data-calendar-workspace": "mock", "data-calendar-props": JSON.stringify(props) },
      "Calendar Workspace",
    ),
}));

vi.mock("@/components/ai-chat/AiIStandalonePage", () => ({
  default: () => React.createElement("main", { "data-ai-i-workspace": "mock" }, "AI-I Workspace"),
}));

import HomePage from "@/app/page";
import AiPage from "@/app/ai/page";
import AiIPage from "@/app/ai-i/page";
import CalendarPage from "@/app/calendar/page";

describe("home and calendar routes", () => {
  beforeEach(() => {
    redirectMock.mockClear();
    homeWorkspaceMock.mockClear();
  });

  it("renders the ai-i workspace on / without redirecting", async () => {
    const page = await HomePage({
      searchParams: Promise.resolve({}),
    } as never);
    const html = renderToStaticMarkup(page);

    expect(html).toContain("AI-I Workspace");
    expect(redirectMock).not.toHaveBeenCalled();
  });

  it("renders the legacy ai home workspace on /ai", async () => {
    const page = await AiPage({
      searchParams: Promise.resolve({}),
    } as never);
    const html = renderToStaticMarkup(page);

    expect(html).toContain("Home Workspace");
    expect(redirectMock).not.toHaveBeenCalled();
    expect(homeWorkspaceMock.mock.calls[0]?.[0]).toMatchObject({
      initialInputMode: "ai",
      shouldCanonicalizeLegacyQuery: false,
    });
  });

  it("bootstraps idea mode from the legacy inbox segment on /ai", async () => {
    const page = await AiPage({
      searchParams: Promise.resolve({ segment: "inbox" }),
    } as never);
    renderToStaticMarkup(page);

    expect(homeWorkspaceMock.mock.calls[0]?.[0]).toMatchObject({
      initialInputMode: "idea",
      shouldCanonicalizeLegacyQuery: true,
    });
  });

  it("redirects legacy inbox tab requests to the new home segment", async () => {
    await expect(
      CalendarPage({
        searchParams: Promise.resolve({ tab: "inbox" }),
      } as never),
    ).rejects.toThrow("REDIRECT:/ai?segment=inbox");
  });

  it("redirects legacy ai tab requests to the new home segment", async () => {
    await expect(
      CalendarPage({
        searchParams: Promise.resolve({ tab: "ai" }),
      } as never),
    ).rejects.toThrow("REDIRECT:/ai?segment=ai");
  });

  it("redirects ai-i calendar tab requests to the standalone ai-i page", async () => {
    await expect(
      CalendarPage({
        searchParams: Promise.resolve({ tab: "ai-i" }),
      } as never),
    ).rejects.toThrow("REDIRECT:/");
  });

  it("keeps rendering the calendar workspace for non-legacy tabs", async () => {
    const page = await CalendarPage({
      searchParams: Promise.resolve({ tab: "kanban" }),
    } as never);
    const html = renderToStaticMarkup(page);

    expect(html).toContain("Calendar Workspace");
    expect(html).toContain("tab=kanban");
  });

  it("redirects /ai-i to the canonical root ai-i route", async () => {
    expect(() => AiIPage()).toThrow("REDIRECT:/");
  });
});
