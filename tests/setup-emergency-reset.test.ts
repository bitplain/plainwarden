import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/server/rate-limit", () => ({
  checkRateLimitAsync: vi.fn(),
  getClientAddress: vi.fn(() => "127.0.0.1"),
}));

vi.mock("@/lib/server/prisma", () => ({
  default: {
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    session: {
      deleteMany: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

describe("POST /api/setup/emergency/reset", () => {
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

  it("resets password and clears sessions for existing user", async () => {
    process.env.DATABASE_URL = "postgresql://configured";

    const { checkRateLimitAsync } = await import("@/lib/server/rate-limit");
    const { default: prisma } = await import("@/lib/server/prisma");
    const { POST } = await import("@/app/api/setup/emergency/reset/route");

    vi.mocked(checkRateLimitAsync).mockResolvedValue({
      allowed: true,
      remaining: 4,
      retryAfterSeconds: 900,
    });
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: "u1",
      email: "admin@example.com",
    } as never);
    vi.mocked(prisma.user.update).mockResolvedValue({ id: "u1" } as never);
    vi.mocked(prisma.session.deleteMany).mockResolvedValue({ count: 2 } as never);
    vi.mocked(prisma.$transaction).mockResolvedValue([{}, {}] as never);

    const response = await POST(
      new Request("http://localhost/api/setup/emergency/reset", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          userId: "u1",
          newPassword: "new-very-strong-password",
        }),
      }),
    );

    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toEqual({
      ok: true,
      loginEmail: "admin@example.com",
    });
    expect(prisma.user.update).toHaveBeenCalledOnce();
    expect(prisma.session.deleteMany).toHaveBeenCalledOnce();
  });

  it("returns 400 for short password", async () => {
    process.env.DATABASE_URL = "postgresql://configured";

    const { checkRateLimitAsync } = await import("@/lib/server/rate-limit");
    const { POST } = await import("@/app/api/setup/emergency/reset/route");

    vi.mocked(checkRateLimitAsync).mockResolvedValue({
      allowed: true,
      remaining: 4,
      retryAfterSeconds: 900,
    });

    const response = await POST(
      new Request("http://localhost/api/setup/emergency/reset", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          userId: "u1",
          newPassword: "short",
        }),
      }),
    );
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload).toEqual({
      error: "newPassword must be at least 12 characters",
    });
  });

  it("returns 404 when user does not exist", async () => {
    process.env.DATABASE_URL = "postgresql://configured";

    const { checkRateLimitAsync } = await import("@/lib/server/rate-limit");
    const { default: prisma } = await import("@/lib/server/prisma");
    const { POST } = await import("@/app/api/setup/emergency/reset/route");

    vi.mocked(checkRateLimitAsync).mockResolvedValue({
      allowed: true,
      remaining: 4,
      retryAfterSeconds: 900,
    });
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null as never);

    const response = await POST(
      new Request("http://localhost/api/setup/emergency/reset", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          userId: "missing",
          newPassword: "new-very-strong-password",
        }),
      }),
    );
    const payload = await response.json();

    expect(response.status).toBe(404);
    expect(payload).toEqual({
      error: "User not found",
    });
  });

  it("returns 429 when rate limit is exceeded", async () => {
    process.env.DATABASE_URL = "postgresql://configured";

    const { checkRateLimitAsync } = await import("@/lib/server/rate-limit");
    const { POST } = await import("@/app/api/setup/emergency/reset/route");

    vi.mocked(checkRateLimitAsync).mockResolvedValue({
      allowed: false,
      remaining: 0,
      retryAfterSeconds: 120,
    });

    const response = await POST(
      new Request("http://localhost/api/setup/emergency/reset", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          userId: "u1",
          newPassword: "new-very-strong-password",
        }),
      }),
    );
    const payload = await response.json();

    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBe("120");
    expect(payload).toEqual({
      error: "Too many recovery attempts. Try again later.",
    });
  });
});
