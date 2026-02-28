import { describe, expect, it } from "vitest";
import {
  validateCreateBoardInput,
  validateUpdateBoardInput,
  validateCreateColumnInput,
  validateUpdateColumnInput,
  validateCreateCardInput,
  validateUpdateCardInput,
  validateMoveCardInput,
  validateCreateChecklistInput,
  validateUpdateChecklistInput,
  validateCreateChecklistItemInput,
  validateUpdateChecklistItemInput,
  validateCreateCommentInput,
  validateUpdateCommentInput,
  validateCreateWorklogInput,
  validateAddDependencyInput,
} from "@/lib/server/kanban-validators";

describe("validateCreateBoardInput", () => {
  it("accepts valid board input", () => {
    const result = validateCreateBoardInput({ title: "My Board" });
    expect(result.title).toBe("My Board");
  });

  it("trims title", () => {
    const result = validateCreateBoardInput({ title: "  My Board  " });
    expect(result.title).toBe("My Board");
  });

  it("rejects missing title", () => {
    expect(() => validateCreateBoardInput({})).toThrow();
  });

  it("rejects empty title", () => {
    expect(() => validateCreateBoardInput({ title: "   " })).toThrow();
  });

  it("rejects title longer than 100 characters", () => {
    expect(() => validateCreateBoardInput({ title: "a".repeat(101) })).toThrow();
  });

  it("rejects non-object payload", () => {
    expect(() => validateCreateBoardInput("string")).toThrow();
  });
});

describe("validateUpdateBoardInput", () => {
  it("accepts title update", () => {
    const result = validateUpdateBoardInput({ title: "New Title" });
    expect(result.title).toBe("New Title");
  });

  it("rejects empty payload", () => {
    expect(() => validateUpdateBoardInput({})).toThrow();
  });
});

describe("validateCreateColumnInput", () => {
  const valid = { title: "Backlog", position: 0 };

  it("accepts minimal valid input", () => {
    const result = validateCreateColumnInput(valid);
    expect(result.title).toBe("Backlog");
    expect(result.position).toBe(0);
    expect(result.isDone).toBe(false);
  });

  it("accepts wipLimit", () => {
    const result = validateCreateColumnInput({ ...valid, wipLimit: 5 });
    expect(result.wipLimit).toBe(5);
  });

  it("accepts isDone flag", () => {
    const result = validateCreateColumnInput({ ...valid, isDone: true });
    expect(result.isDone).toBe(true);
  });

  it("rejects missing position", () => {
    expect(() => validateCreateColumnInput({ title: "Test" })).toThrow();
  });

  it("rejects negative position", () => {
    expect(() => validateCreateColumnInput({ ...valid, position: -1 })).toThrow();
  });

  it("rejects wipLimit of 0", () => {
    expect(() => validateCreateColumnInput({ ...valid, wipLimit: 0 })).toThrow();
  });
});

describe("validateUpdateColumnInput", () => {
  it("accepts partial update", () => {
    const result = validateUpdateColumnInput({ title: "In Progress" });
    expect(result.title).toBe("In Progress");
  });

  it("accepts null wipLimit to remove limit", () => {
    const result = validateUpdateColumnInput({ wipLimit: null });
    expect(result.wipLimit).toBeNull();
  });

  it("accepts isDone update", () => {
    const result = validateUpdateColumnInput({ isDone: true });
    expect(result.isDone).toBe(true);
  });

  it("rejects empty payload", () => {
    expect(() => validateUpdateColumnInput({})).toThrow();
  });
});

describe("validateCreateCardInput", () => {
  const valid = { title: "Fix bug", position: 0 };

  it("accepts minimal valid input", () => {
    const result = validateCreateCardInput(valid);
    expect(result.title).toBe("Fix bug");
    expect(result.position).toBe(0);
    expect(result.description).toBe("");
  });

  it("accepts dueDate", () => {
    const result = validateCreateCardInput({ ...valid, dueDate: "2026-04-01" });
    expect(result.dueDate).toBe("2026-04-01");
  });

  it("rejects invalid dueDate format", () => {
    expect(() => validateCreateCardInput({ ...valid, dueDate: "01/04/2026" })).toThrow();
  });

  it("accepts eventLinks array", () => {
    const result = validateCreateCardInput({ ...valid, eventLinks: ["evt-1", "evt-2"] });
    expect(result.eventLinks).toEqual(["evt-1", "evt-2"]);
  });

  it("rejects non-array eventLinks", () => {
    expect(() => validateCreateCardInput({ ...valid, eventLinks: "evt-1" })).toThrow();
  });

  it("rejects missing position", () => {
    expect(() => validateCreateCardInput({ title: "Test" })).toThrow();
  });

  it("rejects title longer than 255 characters", () => {
    expect(() => validateCreateCardInput({ title: "a".repeat(256), position: 0 })).toThrow();
  });
});

describe("validateUpdateCardInput", () => {
  it("accepts title update", () => {
    const result = validateUpdateCardInput({ title: "New title" });
    expect(result.title).toBe("New title");
  });

  it("accepts null dueDate to clear due date", () => {
    const result = validateUpdateCardInput({ dueDate: null });
    expect(result.dueDate).toBeNull();
  });

  it("accepts valid dueDate", () => {
    const result = validateUpdateCardInput({ dueDate: "2026-12-31" });
    expect(result.dueDate).toBe("2026-12-31");
  });

  it("rejects empty payload", () => {
    expect(() => validateUpdateCardInput({})).toThrow();
  });
});

describe("validateMoveCardInput", () => {
  it("accepts valid move input", () => {
    const result = validateMoveCardInput({ columnId: "col-1", position: 2 });
    expect(result.columnId).toBe("col-1");
    expect(result.position).toBe(2);
  });

  it("rejects missing columnId", () => {
    expect(() => validateMoveCardInput({ position: 0 })).toThrow();
  });

  it("rejects missing position", () => {
    expect(() => validateMoveCardInput({ columnId: "col-1" })).toThrow();
  });

  it("rejects negative position", () => {
    expect(() => validateMoveCardInput({ columnId: "col-1", position: -1 })).toThrow();
  });
});

describe("validateCreateChecklistInput", () => {
  it("accepts valid input", () => {
    const result = validateCreateChecklistInput({ title: "Acceptance Criteria" });
    expect(result.title).toBe("Acceptance Criteria");
  });

  it("rejects missing title", () => {
    expect(() => validateCreateChecklistInput({})).toThrow();
  });

  it("rejects title longer than 200 characters", () => {
    expect(() => validateCreateChecklistInput({ title: "a".repeat(201) })).toThrow();
  });
});

describe("validateUpdateChecklistInput", () => {
  it("accepts title update", () => {
    const result = validateUpdateChecklistInput({ title: "New Title" });
    expect(result.title).toBe("New Title");
  });

  it("rejects empty payload", () => {
    expect(() => validateUpdateChecklistInput({})).toThrow();
  });
});

describe("validateCreateChecklistItemInput", () => {
  it("accepts valid input", () => {
    const result = validateCreateChecklistItemInput({ text: "Write tests", position: 0 });
    expect(result.text).toBe("Write tests");
    expect(result.position).toBe(0);
  });

  it("rejects missing text", () => {
    expect(() => validateCreateChecklistItemInput({ position: 0 })).toThrow();
  });

  it("rejects missing position", () => {
    expect(() => validateCreateChecklistItemInput({ text: "Do something" })).toThrow();
  });

  it("rejects text longer than 500 characters", () => {
    expect(() => validateCreateChecklistItemInput({ text: "a".repeat(501), position: 0 })).toThrow();
  });
});

describe("validateUpdateChecklistItemInput", () => {
  it("accepts text update", () => {
    const result = validateUpdateChecklistItemInput({ text: "Updated text" });
    expect(result.text).toBe("Updated text");
  });

  it("accepts completed flag", () => {
    const result = validateUpdateChecklistItemInput({ completed: true });
    expect(result.completed).toBe(true);
  });

  it("accepts position update", () => {
    const result = validateUpdateChecklistItemInput({ position: 3 });
    expect(result.position).toBe(3);
  });

  it("rejects empty payload", () => {
    expect(() => validateUpdateChecklistItemInput({})).toThrow();
  });

  it("rejects non-boolean completed", () => {
    expect(() => validateUpdateChecklistItemInput({ completed: "yes" })).toThrow();
  });
});

describe("validateCreateCommentInput", () => {
  it("accepts valid comment body", () => {
    const result = validateCreateCommentInput({ body: "Great work @alice!" });
    expect(result.body).toBe("Great work @alice!");
  });

  it("rejects empty body", () => {
    expect(() => validateCreateCommentInput({ body: "" })).toThrow();
  });

  it("rejects missing body", () => {
    expect(() => validateCreateCommentInput({})).toThrow();
  });
});

describe("validateUpdateCommentInput", () => {
  it("accepts valid comment body", () => {
    const result = validateUpdateCommentInput({ body: "Updated comment" });
    expect(result.body).toBe("Updated comment");
  });

  it("rejects empty body", () => {
    expect(() => validateUpdateCommentInput({ body: "" })).toThrow();
  });
});

describe("validateCreateWorklogInput", () => {
  const valid = {
    startedAt: "2026-03-01T10:00:00Z",
    endedAt: "2026-03-01T11:30:00Z",
  };

  it("accepts valid worklog input", () => {
    const result = validateCreateWorklogInput(valid);
    expect(result.startedAt).toBe(valid.startedAt);
    expect(result.endedAt).toBe(valid.endedAt);
    expect(result.note).toBe("");
  });

  it("accepts optional note", () => {
    const result = validateCreateWorklogInput({ ...valid, note: "Focused session" });
    expect(result.note).toBe("Focused session");
  });

  it("rejects endedAt before startedAt", () => {
    expect(() =>
      validateCreateWorklogInput({
        startedAt: "2026-03-01T12:00:00Z",
        endedAt: "2026-03-01T10:00:00Z",
      }),
    ).toThrow();
  });

  it("rejects invalid datetime format", () => {
    expect(() =>
      validateCreateWorklogInput({ startedAt: "01/03/2026", endedAt: "2026-03-01T11:00:00Z" }),
    ).toThrow();
  });

  it("rejects missing startedAt", () => {
    expect(() => validateCreateWorklogInput({ endedAt: "2026-03-01T11:00:00Z" })).toThrow();
  });

  it("rejects missing endedAt", () => {
    expect(() => validateCreateWorklogInput({ startedAt: "2026-03-01T10:00:00Z" })).toThrow();
  });
});

describe("validateAddDependencyInput", () => {
  it("accepts valid dependency input", () => {
    const result = validateAddDependencyInput({ dependsOnId: "card-uuid-123" });
    expect(result.dependsOnId).toBe("card-uuid-123");
  });

  it("rejects missing dependsOnId", () => {
    expect(() => validateAddDependencyInput({})).toThrow();
  });

  it("rejects empty dependsOnId", () => {
    expect(() => validateAddDependencyInput({ dependsOnId: "" })).toThrow();
  });

  it("rejects non-object payload", () => {
    expect(() => validateAddDependencyInput(null)).toThrow();
  });
});
