import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { proxy } from "@/proxy";

vi.mock("@/lib/server/json-db", () => ({
  hasUsers: vi.fn(),
}));

vi.mock("@/lib/server/setup", () => ({
  isDatabaseConfigured: vi.fn(),
}));

vi.mock("@/lib/server/session", () => ({
  SESSION_COOKIE_NAME: "netden_session",
  hashSessionToken: vi.fn(() => "hash"),
  isSessionActive: vi.fn(async () => false),
  verifySessionToken: vi.fn(() => null),
}));

describe("proxy page routing", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("redirects /setup to /register when database exists but no users remain", async () => {
    const { isDatabaseConfigured } = await import("@/lib/server/setup");
    const { hasUsers } = await import("@/lib/server/json-db");

    vi.mocked(isDatabaseConfigured).mockReturnValue(true);
    vi.mocked(hasUsers).mockResolvedValue(false);

    const response = await proxy(new NextRequest("http://localhost/setup"));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("http://localhost/register");
  });

  it("redirects /login to /register while system is uninitialized", async () => {
    const { isDatabaseConfigured } = await import("@/lib/server/setup");
    const { hasUsers } = await import("@/lib/server/json-db");

    vi.mocked(isDatabaseConfigured).mockReturnValue(true);
    vi.mocked(hasUsers).mockResolvedValue(false);

    const response = await proxy(new NextRequest("http://localhost/login"));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("http://localhost/register");
  });

  it("redirects non-setup routes to /setup when users check fails", async () => {
    const { isDatabaseConfigured } = await import("@/lib/server/setup");
    const { hasUsers } = await import("@/lib/server/json-db");

    vi.mocked(isDatabaseConfigured).mockReturnValue(true);
    vi.mocked(hasUsers).mockRejectedValue(new Error("db down"));

    const response = await proxy(new NextRequest("http://localhost/login"));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("http://localhost/setup");
  });

  it("keeps /setup open when users check fails", async () => {
    const { isDatabaseConfigured } = await import("@/lib/server/setup");
    const { hasUsers } = await import("@/lib/server/json-db");

    vi.mocked(isDatabaseConfigured).mockReturnValue(true);
    vi.mocked(hasUsers).mockRejectedValue(new Error("db down"));

    const response = await proxy(new NextRequest("http://localhost/setup"));

    expect(response.status).toBe(200);
    expect(response.headers.get("location")).toBeNull();
  });

  it("redirects revoked page session to /login and clears cookie", async () => {
    const { isDatabaseConfigured } = await import("@/lib/server/setup");
    const { hasUsers } = await import("@/lib/server/json-db");
    const { verifySessionToken, isSessionActive } = await import("@/lib/server/session");

    vi.mocked(isDatabaseConfigured).mockReturnValue(true);
    vi.mocked(hasUsers).mockResolvedValue(true);
    vi.mocked(verifySessionToken).mockReturnValue({
      userId: "u1",
      email: "admin@example.com",
      iat: 1,
      exp: 9999999999,
    });
    vi.mocked(isSessionActive).mockResolvedValue(false);

    const response = await proxy(
      new NextRequest("http://localhost/calendar", {
        headers: { cookie: "netden_session=token123" },
      }),
    );

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("http://localhost/login?from=%2Fcalendar");
    expect(response.headers.get("set-cookie")).toContain("netden_session=;");
  });

  it("keeps /login open for revoked session and clears cookie", async () => {
    const { isDatabaseConfigured } = await import("@/lib/server/setup");
    const { hasUsers } = await import("@/lib/server/json-db");
    const { verifySessionToken, isSessionActive } = await import("@/lib/server/session");

    vi.mocked(isDatabaseConfigured).mockReturnValue(true);
    vi.mocked(hasUsers).mockResolvedValue(true);
    vi.mocked(verifySessionToken).mockReturnValue({
      userId: "u1",
      email: "admin@example.com",
      iat: 1,
      exp: 9999999999,
    });
    vi.mocked(isSessionActive).mockResolvedValue(false);

    const response = await proxy(
      new NextRequest("http://localhost/login", {
        headers: { cookie: "netden_session=token123" },
      }),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("set-cookie")).toContain("netden_session=;");
  });
});

describe("proxy api routing", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 session revoked and clears cookie for protected API", async () => {
    const { verifySessionToken, isSessionActive } = await import("@/lib/server/session");

    vi.mocked(verifySessionToken).mockReturnValue({
      userId: "u1",
      email: "admin@example.com",
      iat: 1,
      exp: 9999999999,
    });
    vi.mocked(isSessionActive).mockResolvedValue(false);

    const response = await proxy(
      new NextRequest("http://localhost/api/events", {
        method: "GET",
        headers: { cookie: "netden_session=token123" },
      }),
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ message: "Session revoked" });
    expect(response.headers.get("set-cookie")).toContain("netden_session=;");
  });
});
