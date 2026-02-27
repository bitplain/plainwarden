import { describe, expect, it } from "vitest";
import {
  buildEventListQueryString,
  buildEventListSearchParams,
} from "@/lib/event-filter-query";

describe("event-filter-query", () => {
  it("builds query params only for provided filters", () => {
    const params = buildEventListSearchParams({
      q: "review",
      type: "task",
      dateFrom: "2026-03-01",
      dateTo: "2026-03-31",
    });

    expect(params.get("q")).toBe("review");
    expect(params.get("type")).toBe("task");
    expect(params.get("status")).toBeNull();
    expect(params.get("dateFrom")).toBe("2026-03-01");
    expect(params.get("dateTo")).toBe("2026-03-31");
  });

  it("returns empty query string for empty filters", () => {
    expect(buildEventListQueryString({})).toBe("");
  });
});
