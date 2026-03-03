import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

describe("POST /api/setup/run", () => {
  const originalDatabaseUrl = process.env.DATABASE_URL;

  beforeEach(() => {
    if (originalDatabaseUrl === undefined) {
      delete process.env.DATABASE_URL;
    } else {
      process.env.DATABASE_URL = originalDatabaseUrl;
    }
  });

  afterEach(() => {
    if (originalDatabaseUrl === undefined) {
      delete process.env.DATABASE_URL;
    } else {
      process.env.DATABASE_URL = originalDatabaseUrl;
    }
  });

  it("returns recovery hint when DATABASE_URL is configured", async () => {
    const { POST } = await import("@/app/api/setup/run/route");
    process.env.DATABASE_URL = "postgresql://configured";

    const response = await POST(
      new Request("http://localhost/api/setup/run", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({}),
      }),
    );

    const payload = await response.json();

    expect(response.status).toBe(409);
    expect(payload).toEqual({
      error: "Setup is disabled because DATABASE_URL is already configured",
      needsRecovery: true,
      recoveryEndpoint: "/api/setup/recover",
      canFactoryReset: true,
    });
  });

  it("keeps normal validation path when DATABASE_URL is not configured", async () => {
    const { POST } = await import("@/app/api/setup/run/route");
    delete process.env.DATABASE_URL;

    const response = await POST(
      new Request("http://localhost/api/setup/run", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({}),
      }),
    );

    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload).toEqual({
      error: "provision must be an object",
    });
  });
});
