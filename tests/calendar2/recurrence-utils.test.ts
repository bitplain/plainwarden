import { describe, expect, it } from "vitest";
import { generateRecurrenceDates } from "@/lib/server/recurrence";

describe("generateRecurrenceDates", () => {
  it("generates daily occurrences by count", () => {
    expect(
      generateRecurrenceDates("2026-03-01", {
        frequency: "daily",
        interval: 1,
        count: 3,
      }),
    ).toEqual(["2026-03-01", "2026-03-02", "2026-03-03"]);
  });

  it("generates weekly occurrences until date", () => {
    expect(
      generateRecurrenceDates("2026-03-01", {
        frequency: "weekly",
        interval: 1,
        until: "2026-03-15",
      }),
    ).toEqual(["2026-03-01", "2026-03-08", "2026-03-15"]);
  });

  it("throws for invalid start date", () => {
    expect(() =>
      generateRecurrenceDates("bad-date", {
        frequency: "monthly",
        interval: 1,
        count: 2,
      }),
    ).toThrow();
  });
});
