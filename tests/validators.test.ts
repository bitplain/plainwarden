import { describe, expect, it } from "vitest";
import {
  validateLoginInput,
  validateRegisterInput,
  validateCreateEventInput,
  validateUpdateEventInput,
} from "@/lib/server/validators";

describe("validateLoginInput", () => {
  it("accepts valid credentials", () => {
    const result = validateLoginInput({ email: "user@example.com", password: "pass1234" });
    expect(result.email).toBe("user@example.com");
    expect(result.password).toBe("pass1234");
  });

  it("normalizes email to lowercase", () => {
    const result = validateLoginInput({ email: "User@Example.COM", password: "pass" });
    expect(result.email).toBe("user@example.com");
  });

  it("rejects missing email", () => {
    expect(() => validateLoginInput({ password: "pass1234" })).toThrow();
  });

  it("rejects invalid email format", () => {
    expect(() => validateLoginInput({ email: "notanemail", password: "pass" })).toThrow();
  });

  it("rejects non-object payload", () => {
    expect(() => validateLoginInput("string")).toThrow();
  });
});

describe("validateRegisterInput", () => {
  const valid = { name: "Alice", email: "alice@example.com", password: "password1" };

  it("accepts valid registration input", () => {
    const result = validateRegisterInput(valid);
    expect(result.name).toBe("Alice");
    expect(result.email).toBe("alice@example.com");
  });

  it("rejects password shorter than 8 characters", () => {
    expect(() => validateRegisterInput({ ...valid, password: "short" })).toThrow();
  });

  it("rejects name longer than 100 characters", () => {
    expect(() => validateRegisterInput({ ...valid, name: "a".repeat(101) })).toThrow();
  });

  it("rejects invalid email", () => {
    expect(() => validateRegisterInput({ ...valid, email: "bad-email" })).toThrow();
  });
});

describe("validateCreateEventInput", () => {
  const valid = {
    title: "Meeting",
    description: "",
    type: "event",
    date: "2026-03-01",
  };

  it("accepts valid event input", () => {
    const result = validateCreateEventInput(valid);
    expect(result.title).toBe("Meeting");
    expect(result.type).toBe("event");
    expect(result.date).toBe("2026-03-01");
    expect(result.status).toBe("pending");
  });

  it("rejects invalid date format", () => {
    expect(() => validateCreateEventInput({ ...valid, date: "01/03/2026" })).toThrow();
  });

  it("rejects invalid event type", () => {
    expect(() => validateCreateEventInput({ ...valid, type: "meeting" })).toThrow();
  });

  it("rejects title longer than 100 characters", () => {
    expect(() =>
      validateCreateEventInput({ ...valid, title: "t".repeat(101) }),
    ).toThrow();
  });

  it("accepts optional time in HH:MM format", () => {
    const result = validateCreateEventInput({ ...valid, time: "14:30" });
    expect(result.time).toBe("14:30");
  });

  it("rejects time in invalid format", () => {
    expect(() => validateCreateEventInput({ ...valid, time: "2:30pm" })).toThrow();
  });
});

describe("validateUpdateEventInput", () => {
  it("accepts partial update", () => {
    const result = validateUpdateEventInput({ title: "New title" });
    expect(result.title).toBe("New title");
  });

  it("throws when no fields provided", () => {
    expect(() => validateUpdateEventInput({})).toThrow();
  });

  it("accepts status update", () => {
    const result = validateUpdateEventInput({ status: "done" });
    expect(result.status).toBe("done");
  });
});
