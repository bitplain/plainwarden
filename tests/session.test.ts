import { describe, expect, it, afterEach, beforeEach } from "vitest";
import { createSessionToken, verifySessionToken } from "@/lib/server/session";

const VALID_SECRET = "a".repeat(32);

describe("session token", () => {
  const originalSecret = process.env.NETDEN_SESSION_SECRET;

  beforeEach(() => {
    process.env.NETDEN_SESSION_SECRET = VALID_SECRET;
  });

  afterEach(() => {
    if (originalSecret === undefined) {
      delete process.env.NETDEN_SESSION_SECRET;
    } else {
      process.env.NETDEN_SESSION_SECRET = originalSecret;
    }
  });

  it("creates and verifies a valid session token", () => {
    const token = createSessionToken({ id: "user-1", email: "user@example.com" });
    const payload = verifySessionToken(token);

    expect(payload).not.toBeNull();
    expect(payload?.userId).toBe("user-1");
    expect(payload?.email).toBe("user@example.com");
  });

  it("returns null for a tampered token", () => {
    const token = createSessionToken({ id: "user-1", email: "user@example.com" });
    const tampered = token.slice(0, -3) + "xxx";
    expect(verifySessionToken(tampered)).toBeNull();
  });

  it("returns null for an undefined token", () => {
    expect(verifySessionToken(undefined)).toBeNull();
  });

  it("returns null for a token without a dot separator", () => {
    expect(verifySessionToken("nodothere")).toBeNull();
  });

  it("throws when NETDEN_SESSION_SECRET is missing", () => {
    delete process.env.NETDEN_SESSION_SECRET;
    expect(() => createSessionToken({ id: "u", email: "u@e.com" })).toThrow(
      "NETDEN_SESSION_SECRET is required",
    );
  });

  it("throws when NETDEN_SESSION_SECRET is shorter than 32 characters", () => {
    process.env.NETDEN_SESSION_SECRET = "short";
    expect(() => createSessionToken({ id: "u", email: "u@e.com" })).toThrow(
      "NETDEN_SESSION_SECRET must be at least 32 characters",
    );
  });
});
