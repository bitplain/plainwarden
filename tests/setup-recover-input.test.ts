import { describe, expect, it } from "vitest";
import { validateSetupRecoverInput } from "@/lib/server/setup";

describe("validateSetupRecoverInput", () => {
  const basePayload = {
    pgAdmin: {
      host: "127.0.0.1",
      port: 5432,
      user: "postgres",
      password: "postgres-secret",
      sslMode: "require" as const,
    },
    provision: {
      dbName: "netden",
      appRole: "netden_app",
      appPassword: "123456789012",
    },
  };

  it("accepts recovery payload without account reset", () => {
    const parsed = validateSetupRecoverInput(basePayload);
    expect(parsed.provision.dbName).toBe("netden");
    expect(parsed.accountRecovery).toBeUndefined();
  });

  it("accepts accountRecovery with valid email and password", () => {
    const parsed = validateSetupRecoverInput({
      ...basePayload,
      accountRecovery: {
        email: "Admin@Example.com",
        password: "very-strong-pass-123",
      },
    });

    expect(parsed.accountRecovery).toEqual({
      email: "admin@example.com",
      password: "very-strong-pass-123",
    });
  });

  it("rejects accountRecovery with invalid email", () => {
    expect(() =>
      validateSetupRecoverInput({
        ...basePayload,
        accountRecovery: {
          email: "not-an-email",
          password: "very-strong-pass-123",
        },
      }),
    ).toThrow("accountRecovery.email must be a valid email");
  });

  it("rejects accountRecovery password shorter than 12 chars", () => {
    expect(() =>
      validateSetupRecoverInput({
        ...basePayload,
        accountRecovery: {
          email: "admin@example.com",
          password: "short-pass",
        },
      }),
    ).toThrow("accountRecovery.password must be at least 12 characters");
  });
});
