import { describe, expect, it } from "vitest";
import { checkRateLimit } from "@/lib/server/rate-limit";

describe("checkRateLimit", () => {
  it("allows requests within the limit", () => {
    const key = `test:${Math.random()}`;
    const result = checkRateLimit(key, { maxRequests: 3, windowMs: 60_000 });
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(2);
  });

  it("blocks requests that exceed the limit", () => {
    const key = `test:${Math.random()}`;
    const options = { maxRequests: 2, windowMs: 60_000 };
    checkRateLimit(key, options); // 1st
    checkRateLimit(key, options); // 2nd
    const result = checkRateLimit(key, options); // 3rd — over limit
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it("resets the bucket after the window expires", () => {
    const key = `test:${Math.random()}`;
    const windowMs = 50; // very short window
    const options = { maxRequests: 1, windowMs };
    checkRateLimit(key, options); // consume the only slot

    return new Promise<void>((resolve) => {
      setTimeout(() => {
        const result = checkRateLimit(key, options);
        expect(result.allowed).toBe(true);
        resolve();
      }, windowMs + 10);
    });
  });

  it("throws for non-positive maxRequests", () => {
    expect(() => checkRateLimit("k", { maxRequests: 0, windowMs: 1000 })).toThrow();
  });

  it("throws for non-positive windowMs", () => {
    expect(() => checkRateLimit("k", { maxRequests: 5, windowMs: 0 })).toThrow();
  });

  it("returns retryAfterSeconds >= 1 when blocked", () => {
    const key = `test:${Math.random()}`;
    const options = { maxRequests: 1, windowMs: 60_000 };
    checkRateLimit(key, options);
    const result = checkRateLimit(key, options);
    expect(result.retryAfterSeconds).toBeGreaterThanOrEqual(1);
  });
});
