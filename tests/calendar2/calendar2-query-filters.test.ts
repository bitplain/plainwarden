import { describe, expect, it } from "vitest";
import {
  buildCalendar2EventFilters,
  type Calendar2CategoryFilter,
} from "@/components/calendar2/calendar2-query-filters";

interface CaseInput {
  q: string;
  category: Calendar2CategoryFilter;
}

describe("buildCalendar2EventFilters", () => {
  it("maps event category to type filter", () => {
    const input: CaseInput = {
      q: " review ",
      category: "event",
    };

    expect(buildCalendar2EventFilters(input)).toEqual({
      q: "review",
      type: "event",
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

  it("drops empty query", () => {
    const input: CaseInput = {
      q: "   ",
      category: "all",
    };

    expect(buildCalendar2EventFilters(input)).toEqual({});
  });
});
