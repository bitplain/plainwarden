import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  getUserIdFromRequest: vi.fn(),
  getPushReceiptForUser: vi.fn(),
  updatePushReceiptForUser: vi.fn(),
}));

vi.mock("@/lib/server/auth", () => ({
  getUserIdFromRequest: mocks.getUserIdFromRequest,
}));

vi.mock("@/lib/server/push-receipts-db", () => ({
  getPushReceiptForUser: mocks.getPushReceiptForUser,
  updatePushReceiptForUser: mocks.updatePushReceiptForUser,
}));

import { GET as GET_PUSH_RECEIPT, POST as POST_PUSH_RECEIPT } from "@/app/api/push/receipt/route";

describe("push receipt route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("GET requires auth", async () => {
    mocks.getUserIdFromRequest.mockReturnValue(null);
    const request = new NextRequest("http://localhost/api/push/receipt?token=test-token-1234");

    const response = await GET_PUSH_RECEIPT(request);
    const payload = await response.json();

    expect(response.status).toBe(401);
    expect(payload.message).toBe("Unauthorized");
  });

  it("GET returns receipt payload", async () => {
    mocks.getUserIdFromRequest.mockReturnValue("u1");
    mocks.getPushReceiptForUser.mockResolvedValue({
      version: 1,
      userId: "u1",
      token: "test-token-1234",
      sentAt: "2026-03-05T14:00:00.000Z",
      receivedAt: "2026-03-05T14:00:01.000Z",
      shownAt: "2026-03-05T14:00:01.100Z",
      updatedAt: "2026-03-05T14:00:01.100Z",
    });

    const request = new NextRequest("http://localhost/api/push/receipt?token=test-token-1234");
    const response = await GET_PUSH_RECEIPT(request);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.ok).toBe(true);
    expect(payload.receipt.token).toBe("test-token-1234");
  });

  it("POST stores receipt event", async () => {
    mocks.getUserIdFromRequest.mockReturnValue("u1");
    mocks.updatePushReceiptForUser.mockResolvedValue({
      version: 1,
      userId: "u1",
      token: "test-token-1234",
      sentAt: "2026-03-05T14:00:00.000Z",
      receivedAt: "2026-03-05T14:00:01.000Z",
      updatedAt: "2026-03-05T14:00:01.000Z",
    });

    const request = new NextRequest("http://localhost/api/push/receipt", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        token: "test-token-1234",
        phase: "received",
      }),
    });

    const response = await POST_PUSH_RECEIPT(request);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.ok).toBe(true);
    expect(mocks.updatePushReceiptForUser).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "u1",
        token: "test-token-1234",
        phase: "received",
      }),
    );
  });
});
