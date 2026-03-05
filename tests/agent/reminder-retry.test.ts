import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findEvents: vi.fn(),
  findCards: vi.fn(),
  saveReminderCandidates: vi.fn(),
  listPendingPushReminders: vi.fn(),
  countPushedInLastHour: vi.fn(),
  markReminderPushDelivered: vi.fn(),
  markReminderPushRetryScheduled: vi.fn(),
  markReminderPushFailedFinal: vi.fn(),
  sendPushToUser: vi.fn(),
}));

vi.mock("@/lib/server/prisma", () => ({
  default: {
    event: {
      findMany: mocks.findEvents,
    },
    kanbanCard: {
      findMany: mocks.findCards,
    },
    user: {
      findMany: vi.fn(),
    },
  },
}));

vi.mock("@/lib/server/reminder-db", () => ({
  saveReminderCandidates: mocks.saveReminderCandidates,
  listPendingPushReminders: mocks.listPendingPushReminders,
  countPushedInLastHour: mocks.countPushedInLastHour,
  markReminderPushDelivered: mocks.markReminderPushDelivered,
  markReminderPushRetryScheduled: mocks.markReminderPushRetryScheduled,
  markReminderPushFailedFinal: mocks.markReminderPushFailedFinal,
}));

vi.mock("@/lib/server/push-delivery", () => ({
  sendPushToUser: mocks.sendPushToUser,
}));

import { runReminderJob } from "@/lib/server/reminder-orchestrator";

describe("runReminderJob retry policy", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mocks.findEvents.mockResolvedValue([
      {
        id: "evt-3333",
        title: "3333",
        date: "2026-03-05",
        time: "16:53",
      },
    ]);
    mocks.findCards.mockResolvedValue([]);
    mocks.saveReminderCandidates.mockResolvedValue({ created: 1 });
    mocks.countPushedInLastHour.mockResolvedValue(0);
    mocks.markReminderPushDelivered.mockResolvedValue(true);
    mocks.markReminderPushRetryScheduled.mockResolvedValue(true);
    mocks.markReminderPushFailedFinal.mockResolvedValue(true);
  });

  it("schedules retry +2m after first transient failure", async () => {
    mocks.listPendingPushReminders.mockResolvedValue([
      {
        id: "r1",
        title: "3333",
        body: "Срок сегодня: 3333",
        navigateTo: "/calendar",
        dedupeKey: "u1:calendar_event:evt-3333:due_today:2026-03-05:16:53",
        severity: 4,
        pushAttemptCount: 0,
      },
    ]);
    mocks.sendPushToUser.mockResolvedValue({
      sent: 0,
      failed: 1,
      inactive: 0,
      transientFailed: 1,
      permanentFailed: 0,
      hasActiveSubscriptions: true,
    });

    const result = await runReminderJob({
      userId: "u1",
      nowIso: "2026-03-05T13:53:00.000Z",
      hourlyPushLimit: 5,
    });

    expect(result.users).toHaveLength(1);
    expect(result.users[0].pushRetried).toBe(1);
    expect(result.users[0].pushRetryScheduled).toBe(1);
    expect(result.users[0].pushFailedFinal).toBe(0);
    expect(mocks.markReminderPushRetryScheduled).toHaveBeenCalledTimes(1);

    const retryInput = mocks.markReminderPushRetryScheduled.mock.calls[0][0] as {
      nextPushAttemptAt: Date;
      expectedAttemptCount: number;
    };
    expect(retryInput.expectedAttemptCount).toBe(0);
    expect(retryInput.nextPushAttemptAt.toISOString()).toBe("2026-03-05T13:55:00.000Z");
  });

  it("marks final fail on third transient attempt", async () => {
    mocks.listPendingPushReminders.mockResolvedValue([
      {
        id: "r2",
        title: "3333",
        body: "Срок сегодня: 3333",
        navigateTo: "/calendar",
        dedupeKey: "u1:calendar_event:evt-3333:due_today:2026-03-05:16:53",
        severity: 4,
        pushAttemptCount: 2,
      },
    ]);
    mocks.sendPushToUser.mockResolvedValue({
      sent: 0,
      failed: 1,
      inactive: 0,
      transientFailed: 1,
      permanentFailed: 0,
      hasActiveSubscriptions: true,
    });

    const result = await runReminderJob({
      userId: "u1",
      nowIso: "2026-03-05T13:53:00.000Z",
      hourlyPushLimit: 5,
    });

    expect(result.users[0].pushRetried).toBe(1);
    expect(result.users[0].pushRetryScheduled).toBe(0);
    expect(result.users[0].pushFailedFinal).toBe(1);
    expect(mocks.markReminderPushFailedFinal).toHaveBeenCalledTimes(1);
    expect(mocks.markReminderPushRetryScheduled).not.toHaveBeenCalled();
  });

  it("marks reminder as pushed when at least one subscription receives notification", async () => {
    mocks.listPendingPushReminders.mockResolvedValue([
      {
        id: "r3",
        title: "3333",
        body: "Срок сегодня: 3333",
        navigateTo: "/calendar",
        dedupeKey: "u1:calendar_event:evt-3333:due_today:2026-03-05:16:53",
        severity: 4,
        pushAttemptCount: 0,
      },
    ]);
    mocks.sendPushToUser.mockResolvedValue({
      sent: 1,
      failed: 0,
      inactive: 0,
      transientFailed: 0,
      permanentFailed: 0,
      hasActiveSubscriptions: true,
    });

    const result = await runReminderJob({
      userId: "u1",
      nowIso: "2026-03-05T13:53:00.000Z",
      hourlyPushLimit: 5,
    });

    expect(result.users[0].pushSent).toBe(1);
    expect(mocks.markReminderPushDelivered).toHaveBeenCalledTimes(1);
    expect(mocks.markReminderPushRetryScheduled).not.toHaveBeenCalled();
    expect(mocks.markReminderPushFailedFinal).not.toHaveBeenCalled();
  });
});
