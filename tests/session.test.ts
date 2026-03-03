import { describe, expect, it, afterEach, beforeEach } from "vitest";
import {
  createSessionToken,
  getSessionCookieOptions,
  verifySessionToken,
} from "@/lib/server/session";

const VALID_SECRET = "a".repeat(32);

describe("session token", () => {
  const originalSecret = process.env.NETDEN_SESSION_SECRET;
  const originalDatabaseUrl = process.env.DATABASE_URL;

  beforeEach(() => {
    process.env.NETDEN_SESSION_SECRET = VALID_SECRET;
  });

  afterEach(() => {
    if (originalSecret === undefined) {
      delete process.env.NETDEN_SESSION_SECRET;
    } else {
      process.env.NETDEN_SESSION_SECRET = originalSecret;
    }

    if (originalDatabaseUrl === undefined) {
      delete process.env.DATABASE_URL;
    } else {
      process.env.DATABASE_URL = originalDatabaseUrl;
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

  it("uses secret derived from DATABASE_URL when NETDEN_SESSION_SECRET is missing", () => {
    delete process.env.NETDEN_SESSION_SECRET;
    process.env.DATABASE_URL = "postgresql://user:pass@db:5432/netden?schema=public";

    const token = createSessionToken({ id: "u", email: "u@e.com" });
    const payload = verifySessionToken(token);

    expect(payload?.userId).toBe("u");
    expect(payload?.email).toBe("u@e.com");
  });

  it("uses derived secret when NETDEN_SESSION_SECRET is shorter than 32 characters", () => {
    process.env.NETDEN_SESSION_SECRET = "short";

    const token = createSessionToken({ id: "u", email: "u@e.com" });
    const payload = verifySessionToken(token);

    expect(payload?.userId).toBe("u");
    expect(payload?.email).toBe("u@e.com");
  });

  it("returns non-secure cookie options for plain HTTP requests", () => {
    const options = getSessionCookieOptions(new Request("http://localhost/login"));
    expect(options.secure).toBe(false);
  });

  it("returns secure cookie options when x-forwarded-proto is https", () => {
    const options = getSessionCookieOptions(
      new Request("http://localhost/login", {
        headers: {
          "x-forwarded-proto": "https",
        },
      }),
    );
    expect(options.secure).toBe(true);
  });

  it("returns secure cookie options for https URL", () => {
    const options = getSessionCookieOptions(new Request("https://example.com/login"));
    expect(options.secure).toBe(true);
  });
});
