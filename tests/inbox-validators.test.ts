import { describe, expect, it } from "vitest";
import {
  parseInboxStatusParam,
  validateConvertInboxItemInput,
  validateCreateInboxItemInput,
} from "@/lib/server/validators";

describe("inbox validators", () => {
  it("validates create inbox item payload", () => {
    const input = validateCreateInboxItemInput({
      content: "  Зафиксировать идею  ",
      typeHint: "idea",
    });

    expect(input).toEqual({
      content: "Зафиксировать идею",
      typeHint: "idea",
    });
  });

  it("validates convert payload", () => {
    const input = validateConvertInboxItemInput({
      target: "task",
      dueDate: "2026-03-06",
      isPriority: true,
    });

    expect(input).toEqual({
      target: "task",
      dueDate: "2026-03-06",
      isPriority: true,
    });
  });

  it("parses status query param", () => {
    expect(parseInboxStatusParam("new")).toBe("new");
    expect(parseInboxStatusParam("processed")).toBe("processed");
    expect(parseInboxStatusParam(null)).toBeUndefined();
  });

  it("rejects invalid convert target", () => {
    expect(() => validateConvertInboxItemInput({ target: "habit" })).toThrow();
  });
});
