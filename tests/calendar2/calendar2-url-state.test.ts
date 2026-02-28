import { describe, expect, it } from "vitest";
import {
  buildCalendar2UrlQuery,
  parseCalendar2UrlState,
} from "@/components/calendar2/calendar2-url-state";

describe("parseCalendar2UrlState", () => {
  it("reads valid params from URL", () => {
    const state = parseCalendar2UrlState(
      new URLSearchParams({
        q: "  design review ",
        tab: "kanban",
        view: "week",
        category: "task",
        dateFrom: "2026-03-01",
        dateTo: "2026-03-31",
        date: "2026-03-15",
      }),
      "2026-03-11",
    );

    expect(state).toEqual({
      q: "design review",
      tab: "kanban",
      view: "week",
      category: "task",
      dateFrom: "2026-03-01",
      dateTo: "2026-03-31",
      date: "2026-03-15",
    });
  });

  it("falls back to defaults for invalid params", () => {
    const state = parseCalendar2UrlState(
      new URLSearchParams({
        q: "   ",
        tab: "overview",
        view: "quarter",
        category: "meeting",
        dateFrom: "2026-99-01",
        dateTo: "bad-date",
        date: "not-a-date",
      }),
      "2026-03-11",
    );

    expect(state).toEqual({
      q: "",
      tab: "calendar",
      view: "month",
      category: "all",
      dateFrom: "",
      dateTo: "",
      date: "2026-03-11",
    });
  });

  it("normalizes inverted date range", () => {
    const state = parseCalendar2UrlState(
      new URLSearchParams({
        dateFrom: "2026-03-31",
        dateTo: "2026-03-01",
      }),
      "2026-03-11",
    );

    expect(state.dateFrom).toBe("2026-03-01");
    expect(state.dateTo).toBe("2026-03-31");
  });
});

describe("buildCalendar2UrlQuery", () => {
  it("builds query and keeps unrelated params", () => {
    const query = buildCalendar2UrlQuery({
      currentSearchParams: new URLSearchParams("embedded=1&legacy=1"),
      state: {
        q: " standup ",
        tab: "planner",
        view: "day",
        category: "pending",
        dateFrom: "2026-02-01",
        dateTo: "2026-02-28",
        date: "2026-02-10",
      },
    });

    const params = new URLSearchParams(query);
    expect(params.get("embedded")).toBe("1");
    expect(params.get("legacy")).toBe("1");
    expect(params.get("q")).toBe("standup");
    expect(params.get("tab")).toBe("planner");
    expect(params.get("view")).toBe("day");
    expect(params.get("category")).toBe("pending");
    expect(params.get("dateFrom")).toBe("2026-02-01");
    expect(params.get("dateTo")).toBe("2026-02-28");
    expect(params.get("date")).toBe("2026-02-10");
  });

  it("drops defaults and invalid dates from query", () => {
    const query = buildCalendar2UrlQuery({
      currentSearchParams: new URLSearchParams("tab=notes&view=week&category=done&date=2026-01-01"),
      state: {
        q: "   ",
        tab: "calendar",
        view: "month",
        category: "all",
        dateFrom: "2026-99-01",
        dateTo: "bad-date",
        date: "2026-13-40",
      },
    });

    const params = new URLSearchParams(query);
    expect(params.get("tab")).toBeNull();
    expect(params.get("view")).toBeNull();
    expect(params.get("category")).toBeNull();
    expect(params.get("q")).toBeNull();
    expect(params.get("dateFrom")).toBeNull();
    expect(params.get("dateTo")).toBeNull();
    expect(params.get("date")).toBeNull();
  });

  it("normalizes inverted date range in query output", () => {
    const query = buildCalendar2UrlQuery({
      currentSearchParams: new URLSearchParams(),
      state: {
        q: "",
        tab: "calendar",
        view: "month",
        category: "all",
        dateFrom: "2026-04-10",
        dateTo: "2026-04-01",
        date: "2026-04-11",
      },
    });

    const params = new URLSearchParams(query);
    expect(params.get("dateFrom")).toBe("2026-04-01");
    expect(params.get("dateTo")).toBe("2026-04-10");
  });
});
