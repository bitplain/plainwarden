import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/server/rate-limit", () => ({
  checkRateLimitAsync: vi.fn(),
  getClientAddress: vi.fn(() => "127.0.0.1"),
}));

vi.mock("@/lib/server/prisma", () => ({
  default: {
    user: {
      findMany: vi.fn(),
    },
  },
}));

describe("GET /api/setup/emergency/state", () => {
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

  it("returns masked account list when database is configured and users exist", async () => {
    process.env.DATABASE_URL = "postgresql://configured";

    const { checkRateLimitAsync } = await import("@/lib/server/rate-limit");
    const { default: prisma } = await import("@/lib/server/prisma");
    const { GET } = await import("@/app/api/setup/emergency/state/route");

    vi.mocked(checkRateLimitAsync).mockResolvedValue({
      allowed: true,
      remaining: 19,
      retryAfterSeconds: 900,
    });
    vi.mocked(prisma.user.findMany).mockResolvedValue([
      { id: "u1", email: "admin@example.com" },
      { id: "u2", email: "root@local.net" },
    ] as never);

    const response = await GET(
      new Request("http://localhost/api/setup/emergency/state") as never,
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toEqual({
      ok: true,
      accounts: [
        { userId: "u1", maskedEmail: "a***@e***.com" },
        { userId: "u2", maskedEmail: "r***@l***.net" },
      ],
      legacyRecoveryEndpoint: "/api/setup/recover",
      warning:
        "Emergency recovery is enabled. Use only in trusted self-hosted environments.",
    });
  });

  it("returns 409 when no users are found", async () => {
    process.env.DATABASE_URL = "postgresql://configured";

    const { checkRateLimitAsync } = await import("@/lib/server/rate-limit");
    const { default: prisma } = await import("@/lib/server/prisma");
    const { GET } = await import("@/app/api/setup/emergency/state/route");

    vi.mocked(checkRateLimitAsync).mockResolvedValue({
      allowed: true,
      remaining: 19,
      retryAfterSeconds: 900,
    });
    vi.mocked(prisma.user.findMany).mockResolvedValue([] as never);

    const response = await GET(
      new Request("http://localhost/api/setup/emergency/state") as never,
    );
    const payload = await response.json();

    expect(response.status).toBe(409);
    expect(payload).toEqual({
      error: "Emergency recovery requires at least one existing user",
    });
  });

  it("returns 503 when database is not configured", async () => {
    delete process.env.DATABASE_URL;

    const { checkRateLimitAsync } = await import("@/lib/server/rate-limit");
    const { GET } = await import("@/app/api/setup/emergency/state/route");

    vi.mocked(checkRateLimitAsync).mockResolvedValue({
      allowed: true,
      remaining: 19,
      retryAfterSeconds: 900,
    });

    const response = await GET(
      new Request("http://localhost/api/setup/emergency/state") as never,
    );
    const payload = await response.json();

    expect(response.status).toBe(503);
    expect(payload).toEqual({
      error: "Emergency recovery is unavailable because DATABASE_URL is not configured",
    });
  });

  it("returns 429 when rate limit is exceeded", async () => {
    process.env.DATABASE_URL = "postgresql://configured";

    const { checkRateLimitAsync } = await import("@/lib/server/rate-limit");
    const { GET } = await import("@/app/api/setup/emergency/state/route");

    vi.mocked(checkRateLimitAsync).mockResolvedValue({
      allowed: false,
      remaining: 0,
      retryAfterSeconds: 120,
    });

    const response = await GET(
      new Request("http://localhost/api/setup/emergency/state") as never,
    );
    const payload = await response.json();

    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBe("120");
    expect(payload).toEqual({
      error: "Too many recovery attempts. Try again later.",
    });
  });
});
