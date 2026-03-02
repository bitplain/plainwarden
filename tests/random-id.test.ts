import { afterEach, describe, expect, it, vi } from "vitest";
import { createRandomId } from "@/lib/random-id";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("createRandomId", () => {
  it("uses crypto.randomUUID when available", () => {
    vi.stubGlobal(
      "crypto",
      {
        randomUUID: () => "uuid-from-randomuuid",
      } as unknown as Crypto,
    );

    expect(createRandomId()).toBe("uuid-from-randomuuid");
  });

  it("uses getRandomValues fallback when randomUUID is unavailable", () => {
    const getRandomValues = vi.fn((buffer: Uint8Array) => {
      buffer.fill(0);
      return buffer;
    });

    vi.stubGlobal(
      "crypto",
      {
        getRandomValues,
      } as unknown as Crypto,
    );

    expect(createRandomId()).toBe("00000000-0000-4000-8000-000000000000");
    expect(getRandomValues).toHaveBeenCalledOnce();
  });

  it("uses non-crypto fallback when crypto is unavailable", () => {
    vi.stubGlobal("crypto", undefined);

    expect(createRandomId()).toMatch(/^\d+-[0-9a-f]+-[0-9a-f]+$/);
  });
});
