import { describe, expect, it } from "vitest";
import {
  buildCalendar2EventFilters,
  type Calendar2CategoryFilter,
} from "@/components/calendar2/calendar2-query-filters";

interface CaseInput {
  q: string;
  category: Calendar2CategoryFilter;
  dateFrom?: string;
  dateTo?: string;
}

describe("buildCalendar2EventFilters", () => {
  it("maps event category to type filter", () => {
    const input: CaseInput = {
      q: " review ",
      category: "event",
      dateFrom: "2026-03-01",
      dateTo: "2026-03-31",
    };

    expect(buildCalendar2EventFilters(input)).toEqual({
      q: "review",
      type: "event",
      dateFrom: "2026-03-01",
      dateTo: "2026-03-31",
    });
  });

  it("maps status category to status filter", () => {
    const input: CaseInput = {
      q: "",
      category: "done",
    };

    expect(buildCalendar2EventFilters(input)).toEqual({
      status: "done",
    });
  });

  it("drops invalid dates and empty query", () => {
    const input: CaseInput = {
      q: "   ",
      category: "all",
      dateFrom: "20260301",
      dateTo: "bad",
    };

    expect(buildCalendar2EventFilters(input)).toEqual({});
  });
});
