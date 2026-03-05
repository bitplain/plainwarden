import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/server/auth", () => ({
  getUserIdFromRequest: vi.fn(() => "u1"),
}));

vi.mock("@/lib/server/tasks-db", () => ({
  buildDailyStatsForUser: vi.fn(async () => ({ date: "2026-03-05", tasksCompleted: 2, overdueCount: 1, priorityPlanned: 2, focusMinutes: 0, habitsCompleted: 0 })),
  buildWeeklyStatsForUser: vi.fn(async () => ({ weekStart: "2026-03-02", weekEnd: "2026-03-08", tasksCompleted: 8, overdueCount: 3, focusMinutes: 0, habitsCompleted: 0 })),
}));

import { GET as GET_DAILY } from "@/app/api/stats/daily/route";
import { GET as GET_WEEKLY } from "@/app/api/stats/weekly/route";

describe("stats routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("GET /api/stats/daily returns daily stats", async () => {
    const request = new NextRequest("http://localhost/api/stats/daily?date=2026-03-05");
    const response = await GET_DAILY(request);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.tasksCompleted).toBe(2);
  });

  it("GET /api/stats/weekly returns weekly stats", async () => {
    const request = new NextRequest("http://localhost/api/stats/weekly?date=2026-03-05");
    const response = await GET_WEEKLY(request);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.tasksCompleted).toBe(8);
  });
});
