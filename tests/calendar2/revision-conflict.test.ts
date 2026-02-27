import { describe, expect, it } from "vitest";
import { validateUpdateEventInput } from "@/lib/server/validators";

describe("Revision + 409 (validator layer)", () => {
  it("parses revision=0 correctly", () => {
    const result = validateUpdateEventInput({ status: "done", revision: 0 });
    expect(result.revision).toBe(0);
  });

  it("parses revision=5 correctly", () => {
    const result = validateUpdateEventInput({ status: "done", revision: 5 });
    expect(result.revision).toBe(5);
  });

  it("revision is optional — missing revision is undefined", () => {
    const result = validateUpdateEventInput({ status: "done" });
    expect(result.revision).toBeUndefined();
  });

  it("rejects negative revision", () => {
    expect(() =>
      validateUpdateEventInput({ status: "done", revision: -1 }),
    ).toThrow();
  });

  it("rejects float revision", () => {
    expect(() =>
      validateUpdateEventInput({ status: "done", revision: 2.7 }),
    ).toThrow();
  });

  it("treats revision-only payload as missing mutable fields", () => {
    expect(() => validateUpdateEventInput({ revision: 3 })).toThrow(
      /At least one field/,
    );
  });

  it("revision + recurrenceScope-only payload is also rejected", () => {
    expect(() =>
      validateUpdateEventInput({ recurrenceScope: "all", revision: 1 }),
    ).toThrow(/At least one field/);
  });
});
