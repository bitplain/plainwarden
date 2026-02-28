import { describe, expect, it } from "vitest";
import { applyPushRateLimit } from "@/lib/server/reminder-engine";

describe("applyPushRateLimit", () => {
  it("keeps only top priority reminders inside hourly cap", () => {
    const limited = applyPushRateLimit({
      alreadySentInLastHour: 2,
      hourlyLimit: 3,
      reminders: [
        { id: "r1", severity: 3 },
        { id: "r2", severity: 1 },
        { id: "r3", severity: 2 },
      ],
    });

    expect(limited.allowed.map((item) => item.id)).toEqual(["r1"]);
    expect(limited.dropped.map((item) => item.id)).toEqual(["r3", "r2"]);
  });

  it("drops all when limit exhausted", () => {
    const limited = applyPushRateLimit({
      alreadySentInLastHour: 5,
      hourlyLimit: 5,
      reminders: [{ id: "r1", severity: 3 }],
    });

    expect(limited.allowed).toHaveLength(0);
    expect(limited.dropped).toHaveLength(1);
  });
});
