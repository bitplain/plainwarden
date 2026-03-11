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
        view: "week",
        category: "task",
        date: "2026-03-15",
      }),
      "2026-03-11",
    );

    expect(state).toEqual({
      q: "design review",
      view: "week",
      category: "task",
      date: "2026-03-15",
    });
  });

  it("falls back to defaults for invalid params", () => {
    const state = parseCalendar2UrlState(
      new URLSearchParams({
        q: "   ",
        view: "quarter",
        category: "meeting",
        date: "not-a-date",
      }),
      "2026-03-11",
    );

    expect(state).toEqual({
      q: "",
      view: "month",
      category: "all",
      date: "2026-03-11",
    });
  });
});

describe("buildCalendar2UrlQuery", () => {
  it("builds query and keeps unrelated params", () => {
    const query = buildCalendar2UrlQuery({
      currentSearchParams: new URLSearchParams("embedded=1&legacy=1"),
      state: {
        q: " standup ",
        view: "day",
        category: "pending",
        date: "2026-02-10",
      },
    });

    const params = new URLSearchParams(query);
    expect(params.get("embedded")).toBe("1");
    expect(params.get("legacy")).toBe("1");
    expect(params.get("q")).toBe("standup");
    expect(params.get("view")).toBe("day");
    expect(params.get("category")).toBe("pending");
    expect(params.get("date")).toBe("2026-02-10");
  });

  it("drops defaults and invalid dates from query", () => {
    const query = buildCalendar2UrlQuery({
      currentSearchParams: new URLSearchParams("view=week&category=done&date=2026-01-01"),
      state: {
        q: "   ",
        view: "month",
        category: "all",
        date: "2026-13-40",
      },
    });

    const params = new URLSearchParams(query);
    expect(params.get("view")).toBeNull();
    expect(params.get("category")).toBeNull();
    expect(params.get("q")).toBeNull();
    expect(params.get("dateFrom")).toBeNull();
    expect(params.get("dateTo")).toBeNull();
    expect(params.get("date")).toBeNull();
  });

  it("removes legacy date range params from existing query", () => {
    const query = buildCalendar2UrlQuery({
      currentSearchParams: new URLSearchParams("dateFrom=2026-04-01&dateTo=2026-04-12"),
      state: {
        q: "",
        view: "month",
        category: "all",
        date: "2026-04-11",
      },
    });

    const params = new URLSearchParams(query);
    expect(params.get("dateFrom")).toBeNull();
    expect(params.get("dateTo")).toBeNull();
  });
});
