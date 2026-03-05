import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockUpdateMany } = vi.hoisted(() => ({
  mockUpdateMany: vi.fn(),
}));

vi.mock("@/lib/server/prisma", () => ({
  default: {
    task: {
      updateMany: mockUpdateMany,
    },
  },
}));

import { panicResetTasksForUser } from "@/lib/server/tasks-db";

describe("panicResetTasksForUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUpdateMany.mockResolvedValue({ count: 3 });
  });

  it("moves unfinished tasks to the next day", async () => {
    const result = await panicResetTasksForUser("u1", "2026-03-05");

    expect(mockUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          userId: "u1",
          dueDate: "2026-03-05",
        }),
        data: {
          dueDate: "2026-03-06",
        },
      }),
    );

    expect(result).toEqual({
      moved: 3,
      fromDate: "2026-03-05",
      toDate: "2026-03-06",
    });
  });
});
