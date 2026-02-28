import { describe, expect, it } from "vitest";
import { validateCreateNoteInput, validateUpdateNoteInput } from "@/lib/server/validators";

describe("validateCreateNoteInput", () => {
  const valid = { title: "My Note", body: "Hello **world**" };

  it("accepts minimal valid input", () => {
    const result = validateCreateNoteInput({ title: "Test" });
    expect(result.title).toBe("Test");
    expect(result.body).toBe("");
    expect(result.tags).toEqual([]);
  });

  it("accepts full valid input", () => {
    const result = validateCreateNoteInput({
      ...valid,
      tags: ["tag1", "tag2"],
      parentId: "parent-uuid",
      eventLinks: ["event-uuid"],
    });
    expect(result.title).toBe("My Note");
    expect(result.body).toBe("Hello **world**");
    expect(result.tags).toEqual(["tag1", "tag2"]);
    expect(result.parentId).toBe("parent-uuid");
    expect(result.eventLinks).toEqual(["event-uuid"]);
  });

  it("trims title and tags", () => {
    const result = validateCreateNoteInput({ title: "  Trimmed  ", tags: ["  t  "] });
    expect(result.title).toBe("Trimmed");
    expect(result.tags).toEqual(["t"]);
  });

  it("rejects missing title", () => {
    expect(() => validateCreateNoteInput({ body: "content" })).toThrow();
  });

  it("rejects empty title", () => {
    expect(() => validateCreateNoteInput({ title: "   " })).toThrow();
  });

  it("rejects title longer than 200 characters", () => {
    expect(() => validateCreateNoteInput({ title: "a".repeat(201) })).toThrow();
  });

  it("rejects non-array tags", () => {
    expect(() => validateCreateNoteInput({ title: "Test", tags: "tag1" })).toThrow("tags must be an array");
  });

  it("rejects more than 20 tags", () => {
    expect(() =>
      validateCreateNoteInput({ title: "Test", tags: Array.from({ length: 21 }, (_, i) => `tag${i}`) }),
    ).toThrow();
  });

  it("rejects tag longer than 50 characters", () => {
    expect(() =>
      validateCreateNoteInput({ title: "Test", tags: ["a".repeat(51)] }),
    ).toThrow();
  });

  it("rejects non-object payload", () => {
    expect(() => validateCreateNoteInput("string")).toThrow();
  });
});

describe("validateUpdateNoteInput", () => {
  it("accepts title-only update", () => {
    const result = validateUpdateNoteInput({ title: "New title" });
    expect(result.title).toBe("New title");
  });

  it("accepts body update", () => {
    const result = validateUpdateNoteInput({ body: "New body" });
    expect(result.body).toBe("New body");
  });

  it("accepts null parentId to detach from parent", () => {
    const result = validateUpdateNoteInput({ title: "T", parentId: null });
    expect(result.parentId).toBeNull();
  });

  it("accepts tags update", () => {
    const result = validateUpdateNoteInput({ tags: ["a", "b"] });
    expect(result.tags).toEqual(["a", "b"]);
  });

  it("accepts eventLinks update", () => {
    const result = validateUpdateNoteInput({ eventLinks: ["evt-1"] });
    expect(result.eventLinks).toEqual(["evt-1"]);
  });

  it("throws when no fields provided", () => {
    expect(() => validateUpdateNoteInput({})).toThrow();
  });

  it("rejects non-object payload", () => {
    expect(() => validateUpdateNoteInput(null)).toThrow();
  });

  it("rejects more than 20 tags", () => {
    expect(() =>
      validateUpdateNoteInput({ tags: Array.from({ length: 21 }, (_, i) => `tag${i}`) }),
    ).toThrow();
  });
});
