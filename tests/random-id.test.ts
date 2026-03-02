import { describe, it, expect, vi, afterEach } from "vitest";
import { createRandomId } from "@/lib/random-id";

describe("createRandomId", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns a string", () => {
    const id = createRandomId();
    expect(typeof id).toBe("string");
    expect(id.length).toBeGreaterThan(0);
  });

  it("returns a valid UUID when crypto.randomUUID is available", () => {
    const id = createRandomId();
    // Standard UUID v4 format: 8-4-4-4-12 hex chars
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });

  it("falls back to getRandomValues when randomUUID is unavailable", () => {
    const original = crypto.randomUUID;
    vi.stubGlobal("crypto", {
      randomUUID: undefined,
      getRandomValues: crypto.getRandomValues.bind(crypto),
    });

    const id = createRandomId();
    // Should still produce a UUID v4 format
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);

    vi.stubGlobal("crypto", { randomUUID: original, getRandomValues: crypto.getRandomValues.bind(crypto) });
  });

  it("falls back to Date.now when crypto is completely unavailable", () => {
    vi.stubGlobal("crypto", undefined);

    const id = createRandomId();
    expect(typeof id).toBe("string");
    expect(id.length).toBeGreaterThan(0);
    // Date.now-based format: digits-alphanumeric
    expect(id).toMatch(/^\d+-[a-z0-9]+$/);

    vi.unstubAllGlobals();
  });

  it("generates unique ids", () => {
    const ids = new Set(Array.from({ length: 100 }, () => createRandomId()));
    expect(ids.size).toBe(100);
  });
});
