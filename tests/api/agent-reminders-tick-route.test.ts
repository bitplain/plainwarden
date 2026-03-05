import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  getUserIdFromRequest: vi.fn(),
  runReminderJob: vi.fn(),
}));

vi.mock("@/lib/server/auth", () => ({
  getUserIdFromRequest: mocks.getUserIdFromRequest,
}));

vi.mock("@/lib/server/reminder-orchestrator", () => ({
  runReminderJob: mocks.runReminderJob,
}));

import { POST as POST_REMINDER_TICK } from "@/app/api/agent/reminders/tick/route";

describe("POST /api/agent/reminders/tick", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("requires authentication", async () => {
    mocks.getUserIdFromRequest.mockReturnValue(null);

    const request = new NextRequest("http://localhost/api/agent/reminders/tick", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ source: "manual" }),
    });

    const response = await POST_REMINDER_TICK(request);
    const payload = await response.json();

    expect(response.status).toBe(401);
    expect(payload.message).toBe("Unauthorized");
  });

  it("returns per-user summary for local timer tick", async () => {
    mocks.getUserIdFromRequest.mockReturnValue("u1");
    mocks.runReminderJob.mockResolvedValue({
      nowIso: "2026-03-05T13:53:00.000Z",
      users: [
        {
          userId: "u1",
          candidates: 1,
          created: 1,
          pushAllowed: 1,
          pushDropped: 0,
          pushSent: 1,
          pushRetried: 0,
          pushRetryScheduled: 0,
          pushFailedFinal: 0,
          retried: 0,
        },
      ],
      totals: {
        candidates: 1,
        created: 1,
        pushAllowed: 1,
        pushDropped: 0,
        pushSent: 1,
        pushRetried: 0,
        pushRetryScheduled: 0,
        pushFailedFinal: 0,
      },
    });

    const request = new NextRequest("http://localhost/api/agent/reminders/tick", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        source: "calendar-local-timer",
        nowIso: "2026-03-05T13:53:00.000Z",
      }),
    });

    const response = await POST_REMINDER_TICK(request);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.ok).toBe(true);
    expect(payload.source).toBe("calendar-local-timer");
    expect(payload.result.userId).toBe("u1");
    expect(payload.result.candidates).toBe(1);
    expect(payload.result.nowIso).toBe("2026-03-05T13:53:00.000Z");
  });
});
