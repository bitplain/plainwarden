import { describe, expect, it } from "vitest";
import { computeTaskProgress } from "@/lib/server/tasks-db";

describe("computeTaskProgress", () => {
  it("uses manual progress in manual mode", () => {
    expect(
      computeTaskProgress({
        progressMode: "manual",
        manualProgress: 73,
        subtasksTotal: 5,
        subtasksDone: 1,
      }),
    ).toBe(73);
  });

  it("computes progress from subtasks", () => {
    expect(
      computeTaskProgress({
        progressMode: "subtasks",
        manualProgress: 0,
        subtasksTotal: 4,
        subtasksDone: 3,
      }),
    ).toBe(75);
  });

  it("returns zero when no subtasks", () => {
    expect(
      computeTaskProgress({
        progressMode: "subtasks",
        manualProgress: 0,
        subtasksTotal: 0,
        subtasksDone: 0,
      }),
    ).toBe(0);
  });
});
