import { describe, expect, it } from "vitest";
import {
  buildEventListWhereInput,
  parseEventListFilters,
} from "@/lib/server/event-filters";

describe("parseEventListFilters", () => {
  it("parses valid query filters", () => {
    const params = new URLSearchParams({
      q: "  review  ",
      type: "task",
      status: "done",
      dateFrom: "2026-02-01",
      dateTo: "2026-02-28",
    });

    expect(parseEventListFilters(params)).toEqual({
      q: "review",
      type: "task",
      status: "done",
      dateFrom: "2026-02-01",
      dateTo: "2026-02-28",
    });
  });

  it("ignores invalid filter values", () => {
    const params = new URLSearchParams({
      q: "   ",
      type: "meeting",
      status: "closed",
      dateFrom: "20260201",
      dateTo: "bad-date",
    });

    expect(parseEventListFilters(params)).toEqual({});
  });
});

describe("buildEventListWhereInput", () => {
  it("returns only user filter when no extra filters provided", () => {
    expect(buildEventListWhereInput("user-1", {})).toEqual({
      userId: "user-1",
    });
  });

  it("builds where clause with text and structured filters", () => {
    expect(
      buildEventListWhereInput("user-1", {
        q: "standup",
        type: "event",
        status: "pending",
        dateFrom: "2026-02-10",
        dateTo: "2026-02-20",
      }),
    ).toEqual({
      userId: "user-1",
      type: "event",
      status: "pending",
      date: {
        gte: "2026-02-10",
        lte: "2026-02-20",
      },
      OR: [
        {
          title: {
            contains: "standup",
            mode: "insensitive",
          },
        },
        {
          description: {
            contains: "standup",
            mode: "insensitive",
          },
        },
      ],
    });
  });
});
