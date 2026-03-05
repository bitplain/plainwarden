import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockTransaction } = vi.hoisted(() => ({
  mockTransaction: vi.fn(),
}));

vi.mock("@/lib/server/prisma", () => ({
  default: {
    $transaction: mockTransaction,
  },
}));

vi.mock("@/lib/server/tasks-db", () => ({
  assertPriorityLimit: vi.fn(),
}));

import { convertInboxItemForUser } from "@/lib/server/inbox-db";

describe("convertInboxItemForUser idempotency", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns existing conversion for already processed inbox item", async () => {
    mockTransaction.mockImplementation(async (callback: (tx: {
      inboxItem: {
        findFirst: ReturnType<typeof vi.fn>;
      };
      task: {
        create: ReturnType<typeof vi.fn>;
      };
      event: {
        create: ReturnType<typeof vi.fn>;
      };
      note: {
        create: ReturnType<typeof vi.fn>;
      };
    }) => Promise<unknown>) => {
      const tx = {
        inboxItem: {
          findFirst: vi.fn().mockResolvedValue({
            id: "inbox-1",
            userId: "u1",
            content: "Task from inbox",
            typeHint: "task",
            status: "processed",
            convertedToEntityType: "task",
            convertedToEntityId: "task-1",
            processedAt: new Date("2026-03-05T10:00:00.000Z"),
            archivedAt: null,
            createdAt: new Date("2026-03-05T09:00:00.000Z"),
            updatedAt: new Date("2026-03-05T10:00:00.000Z"),
          }),
        },
        task: { create: vi.fn() },
        event: { create: vi.fn() },
        note: { create: vi.fn() },
      };
      return callback(tx);
    });

    const result = await convertInboxItemForUser("u1", "inbox-1", {
      target: "task",
    });

    expect(result).toMatchObject({
      converted: {
        type: "task",
        id: "task-1",
      },
    });
  });
});
