import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  getUserIdFromRequest: vi.fn(),
  sendPushToUser: vi.fn(),
  updatePushReceiptForUser: vi.fn(),
}));

vi.mock("@/lib/server/auth", () => ({
  getUserIdFromRequest: mocks.getUserIdFromRequest,
}));

vi.mock("@/lib/server/push-delivery", () => ({
  sendPushToUser: mocks.sendPushToUser,
}));

vi.mock("@/lib/server/push-receipts-db", () => ({
  updatePushReceiptForUser: mocks.updatePushReceiptForUser,
}));

import { POST as POST_PUSH_TEST } from "@/app/api/push/test/route";

describe("POST /api/push/test", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getUserIdFromRequest.mockReturnValue("u1");
  });

  it("returns no-active-subscriptions status when user has no subscriptions", async () => {
    mocks.sendPushToUser.mockResolvedValue({
      sent: 0,
      failed: 0,
      inactive: 0,
      transientFailed: 0,
      permanentFailed: 0,
      hasActiveSubscriptions: false,
      deliveryStatus: "no-active-subscriptions",
      reason: "no-active-subscriptions",
      retryRecommended: false,
    });

    const request = new NextRequest("http://localhost/api/push/test", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ title: "T", message: "M" }),
    });

    const response = await POST_PUSH_TEST(request);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.ok).toBe(true);
    expect(payload.deliveryStatus).toBe("no-active-subscriptions");
    expect(payload.reason).toBe("no-active-subscriptions");
    expect(payload.retryRecommended).toBe(false);
  });

  it("returns send-failed status and retry hint", async () => {
    mocks.sendPushToUser.mockResolvedValue({
      sent: 0,
      failed: 1,
      inactive: 0,
      transientFailed: 1,
      permanentFailed: 0,
      hasActiveSubscriptions: true,
      deliveryStatus: "send-failed",
      reason: "transient-failure",
      retryRecommended: true,
    });

    const request = new NextRequest("http://localhost/api/push/test", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ title: "T", message: "M" }),
    });

    const response = await POST_PUSH_TEST(request);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.deliveryStatus).toBe("send-failed");
    expect(payload.reason).toBe("transient-failure");
    expect(payload.retryRecommended).toBe(true);
  });
});
