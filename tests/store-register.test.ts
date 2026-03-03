import { beforeEach, describe, expect, it, vi } from "vitest";
import { createNetdenStore } from "@/lib/store";

vi.mock("@/lib/api", () => ({
  api: {
    me: vi.fn(),
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
    getEvents: vi.fn(),
    createEvent: vi.fn(),
    updateEvent: vi.fn(),
    deleteEvent: vi.fn(),
  },
}));

describe("store register flow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("authenticates immediately after register without extra login request", async () => {
    const { api } = await import("@/lib/api");
    vi.mocked(api.register).mockResolvedValue({
      user: {
        id: "user-1",
        email: "user@example.com",
        name: "User",
        createdAt: "2026-03-03T00:00:00.000Z",
      },
    } as never);
    vi.mocked(api.getEvents).mockResolvedValue([] as never);

    const store = createNetdenStore();
    await store.getState().register({
      name: "User",
      email: "user@example.com",
      password: "supersecure123",
    });

    const state = store.getState();
    expect(api.register).toHaveBeenCalledOnce();
    expect(api.login).not.toHaveBeenCalled();
    expect(state.isAuthenticated).toBe(true);
    expect(state.user?.email).toBe("user@example.com");
    expect(state.isAuthLoading).toBe(false);
  });
});
