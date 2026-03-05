import { describe, expect, it } from "vitest";
import {
  validateCreateSubtaskInput,
  validateCreateTaskInput,
  validateUpdateSubtaskInput,
  validateUpdateTaskInput,
} from "@/lib/server/validators";

describe("task validators", () => {
  it("accepts valid create task payload", () => {
    const payload = validateCreateTaskInput({
      title: "Подготовить отчёт",
      description: "Черновик",
      status: "blocked",
      progressMode: "manual",
      manualProgress: 45,
      dueDate: "2026-03-06",
      isPriority: true,
    });

    expect(payload).toMatchObject({
      title: "Подготовить отчёт",
      status: "blocked",
      progressMode: "manual",
      manualProgress: 45,
      dueDate: "2026-03-06",
      isPriority: true,
    });
  });

  it("accepts update task payload", () => {
    const payload = validateUpdateTaskInput({
      status: "in_progress",
      dueDate: null,
      isPriority: false,
    });

    expect(payload).toEqual({
      status: "in_progress",
      dueDate: null,
      isPriority: false,
    });
  });

  it("accepts create subtask payload", () => {
    const payload = validateCreateSubtaskInput({
      title: "Сделать первый шаг",
      estimateMin: 10,
    });

    expect(payload).toEqual({
      title: "Сделать первый шаг",
      estimateMin: 10,
      position: undefined,
      createdBy: "user",
    });
  });

  it("accepts update subtask payload", () => {
    const payload = validateUpdateSubtaskInput({ status: "done", estimateMin: null });
    expect(payload).toEqual({ status: "done", estimateMin: null });
  });

  it("rejects empty task update", () => {
    expect(() => validateUpdateTaskInput({})).toThrow();
  });
});
