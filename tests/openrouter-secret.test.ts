import { describe, expect, it } from "vitest";
import { decryptSecret, encryptSecret, maskOpenRouterKey } from "@/lib/server/openrouter-secret";

describe("openrouter secret", () => {
  it("encrypts and decrypts key with same secret", () => {
    const plain = "sk-or-v1-abcdefghijklmnopqrstuvwxyz";
    const encoded = encryptSecret(plain, "netden-test-secret");

    expect(encoded).not.toContain(plain);
    expect(encoded.startsWith("v1:")).toBe(true);

    const decoded = decryptSecret(encoded, "netden-test-secret");
    expect(decoded).toBe(plain);
  });

  it("throws on wrong secret", () => {
    const encoded = encryptSecret("sk-or-v1-xyz", "secret-a");
    expect(() => decryptSecret(encoded, "secret-b")).toThrow();
  });

  it("masks key for UI", () => {
    expect(maskOpenRouterKey("sk-or-v1-abcdefghijklmnopqrstuvwxyz")).toBe("sk-or-v1…wxyz");
  });
});
