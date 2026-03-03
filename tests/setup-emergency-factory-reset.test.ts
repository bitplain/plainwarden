import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/server/rate-limit", () => ({
  checkRateLimitAsync: vi.fn(),
  getClientAddress: vi.fn(() => "127.0.0.1"),
}));

vi.mock("@/lib/server/prisma", () => ({
  default: {
    user: { deleteMany: vi.fn() },
    itemLink: { deleteMany: vi.fn() },
    aiActionLog: { deleteMany: vi.fn() },
    rateLimitBucket: { deleteMany: vi.fn() },
    $transaction: vi.fn(),
  },
}));

describe("POST /api/setup/emergency/factory-reset", () => {
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

  it("resets all application data after explicit confirmation", async () => {
    process.env.DATABASE_URL = "postgresql://configured";

    const { checkRateLimitAsync } = await import("@/lib/server/rate-limit");
    const { default: prisma } = await import("@/lib/server/prisma");
    const { POST } = await import("@/app/api/setup/emergency/factory-reset/route");

    vi.mocked(checkRateLimitAsync).mockResolvedValue({
      allowed: true,
      remaining: 1,
      retryAfterSeconds: 3600,
    });
    vi.mocked(prisma.user.deleteMany).mockResolvedValue({ count: 1 } as never);
    vi.mocked(prisma.itemLink.deleteMany).mockResolvedValue({ count: 1 } as never);
    vi.mocked(prisma.aiActionLog.deleteMany).mockResolvedValue({ count: 1 } as never);
    vi.mocked(prisma.rateLimitBucket.deleteMany).mockResolvedValue({ count: 1 } as never);
    vi.mocked(prisma.$transaction).mockResolvedValue([{}, {}, {}, {}] as never);

    const response = await POST(
      new Request("http://localhost/api/setup/emergency/factory-reset", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ confirmText: "RESET ALL DATA" }),
      }) as never,
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toEqual({
      ok: true,
      next: "/register",
    });
    expect(prisma.$transaction).toHaveBeenCalledOnce();
  });

  it("returns 400 for invalid confirmation phrase", async () => {
    process.env.DATABASE_URL = "postgresql://configured";

    const { checkRateLimitAsync } = await import("@/lib/server/rate-limit");
    const { POST } = await import("@/app/api/setup/emergency/factory-reset/route");

    vi.mocked(checkRateLimitAsync).mockResolvedValue({
      allowed: true,
      remaining: 1,
      retryAfterSeconds: 3600,
    });

    const response = await POST(
      new Request("http://localhost/api/setup/emergency/factory-reset", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ confirmText: "WRONG" }),
      }) as never,
    );
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload).toEqual({
      error: "confirmText must be exactly 'RESET ALL DATA'",
    });
  });

  it("returns 429 when rate limit is exceeded", async () => {
    process.env.DATABASE_URL = "postgresql://configured";

    const { checkRateLimitAsync } = await import("@/lib/server/rate-limit");
    const { POST } = await import("@/app/api/setup/emergency/factory-reset/route");

    vi.mocked(checkRateLimitAsync).mockResolvedValue({
      allowed: false,
      remaining: 0,
      retryAfterSeconds: 120,
    });

    const response = await POST(
      new Request("http://localhost/api/setup/emergency/factory-reset", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ confirmText: "RESET ALL DATA" }),
      }) as never,
    );
    const payload = await response.json();

    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBe("120");
    expect(payload).toEqual({
      error: "Too many recovery attempts. Try again later.",
    });
  });
});
