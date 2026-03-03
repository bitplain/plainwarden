import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/server/json-db", () => ({
  hasUsers: vi.fn(),
}));

describe("readSetupState", () => {
  const originalDatabaseUrl = process.env.DATABASE_URL;

  beforeEach(() => {
    vi.clearAllMocks();
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

  it("returns setup-required state when DATABASE_URL is missing", async () => {
    delete process.env.DATABASE_URL;
    const { readSetupState } = await import("@/lib/server/setup");

    const state = await readSetupState();
    expect(state).toEqual({
      databaseConfigured: false,
      initialized: false,
      setupRequired: true,
    });
  });

  it("returns degraded db_unreachable state when users check cannot reach database", async () => {
    process.env.DATABASE_URL = "postgresql://configured";
    const { hasUsers } = await import("@/lib/server/json-db");
    const { readSetupState } = await import("@/lib/server/setup");

    vi.mocked(hasUsers).mockRejectedValue({ code: "P1001" } as never);

    const state = await readSetupState();
    expect(state).toEqual({
      databaseConfigured: true,
      initialized: false,
      setupRequired: true,
      degraded: true,
      reason: "db_unreachable",
    });
  });

  it("returns degraded schema_not_ready state when required tables are missing", async () => {
    process.env.DATABASE_URL = "postgresql://configured";
    const { hasUsers } = await import("@/lib/server/json-db");
    const { readSetupState } = await import("@/lib/server/setup");

    vi.mocked(hasUsers).mockRejectedValue({ code: "P2021" } as never);

    const state = await readSetupState();
    expect(state).toEqual({
      databaseConfigured: true,
      initialized: false,
      setupRequired: true,
      degraded: true,
      reason: "schema_not_ready",
    });
  });
});
