import { describe, expect, it } from "vitest";
import {
  buildCalendar2UrlChange,
  readCalendar2UrlStateFromSearch,
} from "@/components/calendar2/calendar2-url-store";

describe("readCalendar2UrlStateFromSearch", () => {
  it("parses valid calendar2 URL state", () => {
    expect(
      readCalendar2UrlStateFromSearch(
        "?tab=kanban&view=week&category=task&q=review&dateFrom=2026-03-01&dateTo=2026-03-31&date=2026-03-12",
        "2026-03-10",
      ),
    ).toEqual({
      tab: "kanban",
      view: "week",
      category: "task",
      q: "review",
      dateFrom: "2026-03-01",
      dateTo: "2026-03-31",
      date: "2026-03-12",
    });
  });

  it("uses defaults for invalid values", () => {
    expect(
      readCalendar2UrlStateFromSearch(
        "?tab=invalid&view=quarter&category=custom&dateFrom=bad&dateTo=2026-02-40&date=not-date&q=   ",
        "2026-03-10",
      ),
    ).toEqual({
      tab: "calendar",
      view: "month",
      category: "all",
      q: "",
      dateFrom: "",
      dateTo: "",
      date: "2026-03-10",
    });
  });
});

describe("buildCalendar2UrlChange", () => {
  it("builds next URL and keeps unrelated params", () => {
    const result = buildCalendar2UrlChange({
      pathname: "/calendar2",
      search: "?embedded=1",
      hash: "#panel",
      state: {
        tab: "planner",
        view: "day",
        category: "pending",
        q: "standup",
        dateFrom: "2026-02-01",
        dateTo: "2026-02-28",
        date: "2026-02-10",
      },
    });

    expect(result.changed).toBe(true);
    expect(result.nextUrl).toContain("/calendar2?");
    expect(result.nextUrl).toContain("#panel");

    const query = result.nextUrl.split("?")[1].split("#")[0];
    const params = new URLSearchParams(query);
    expect(params.get("embedded")).toBe("1");
    expect(params.get("tab")).toBe("planner");
    expect(params.get("view")).toBe("day");
    expect(params.get("category")).toBe("pending");
    expect(params.get("q")).toBe("standup");
    expect(params.get("dateFrom")).toBe("2026-02-01");
    expect(params.get("dateTo")).toBe("2026-02-28");
    expect(params.get("date")).toBe("2026-02-10");
  });

  it("detects unchanged query", () => {
    const result = buildCalendar2UrlChange({
      pathname: "/calendar2",
      search: "?tab=notes&view=week&category=done&q=review&date=2026-03-12",
      state: {
        tab: "notes",
        view: "week",
        category: "done",
        q: "review",
        dateFrom: "",
        dateTo: "",
        date: "2026-03-12",
      },
    });

    expect(result.changed).toBe(false);
    expect(result.currentQuery).toBe(result.nextQuery);
  });
});
