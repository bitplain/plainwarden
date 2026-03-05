import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  runReminderJob: vi.fn(),
  getRuntimeCronSecret: vi.fn(),
}));

vi.mock("@/lib/server/reminder-orchestrator", () => ({
  runReminderJob: mocks.runReminderJob,
}));

vi.mock("@/lib/server/push-runtime-config", () => ({
  getRuntimeCronSecret: mocks.getRuntimeCronSecret,
}));

import { POST as POST_CRON_REMINDERS } from "@/app/api/cron/reminders/route";

describe("POST /api/cron/reminders", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getRuntimeCronSecret.mockResolvedValue("secret-123");
    mocks.runReminderJob.mockResolvedValue({
      nowIso: "2026-03-05T13:53:00.000Z",
      users: [],
      totals: {
        candidates: 2,
        created: 2,
        pushAllowed: 2,
        pushDropped: 0,
        pushSent: 1,
        pushRetried: 1,
        pushRetryScheduled: 1,
        pushFailedFinal: 0,
      },
    });
  });

  it("returns 401 when cron secret is invalid", async () => {
    const request = new NextRequest("http://localhost/api/cron/reminders", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({}),
    });

    const response = await POST_CRON_REMINDERS(request);
    const payload = await response.json();

    expect(response.status).toBe(401);
    expect(payload.message).toBe("Invalid cron secret");
  });

  it("returns retry aggregates when secret is valid", async () => {
    const request = new NextRequest("http://localhost/api/cron/reminders", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-netden-cron-secret": "secret-123",
      },
      body: JSON.stringify({ nowIso: "2026-03-05T13:53:00.000Z" }),
    });

    const response = await POST_CRON_REMINDERS(request);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.ok).toBe(true);
    expect(payload.pushRetried).toBe(1);
    expect(payload.pushRetryScheduled).toBe(1);
    expect(payload.pushFailedFinal).toBe(0);
  });
});
