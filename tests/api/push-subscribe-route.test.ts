import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  getUserIdFromRequest: vi.fn(),
  upsertPushSubscriptionForUser: vi.fn(),
}));

vi.mock("@/lib/server/auth", () => ({
  getUserIdFromRequest: mocks.getUserIdFromRequest,
}));

vi.mock("@/lib/server/push-subscriptions-db", () => ({
  upsertPushSubscriptionForUser: mocks.upsertPushSubscriptionForUser,
}));

import { POST as POST_PUSH_SUBSCRIBE } from "@/app/api/push/subscribe/route";

describe("POST /api/push/subscribe", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("normalizes payload and stores subscription", async () => {
    mocks.getUserIdFromRequest.mockReturnValue("u1");
    mocks.upsertPushSubscriptionForUser.mockResolvedValue({ id: "sub-1" });

    const request = new NextRequest("http://localhost/api/push/subscribe", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        subscription: {
          endpoint: "  https://fcm.googleapis.com/fcm/send/abc123  ",
          expirationTime: 123456,
          keys: {
            p256dh: "AbCd+123/xyzABCDefghIjklmnop=",
            auth: "QwEr+987/poiQRSTuvwxYZabcd=",
          },
        },
      }),
    });

    const response = await POST_PUSH_SUBSCRIBE(request);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.ok).toBe(true);
    expect(mocks.upsertPushSubscriptionForUser).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "u1",
        subscription: expect.objectContaining({
          endpoint: "https://fcm.googleapis.com/fcm/send/abc123",
          keys: {
            p256dh: "AbCd-123_xyzABCDefghIjklmnop",
            auth: "QwEr-987_poiQRSTuvwxYZabcd",
          },
        }),
      }),
    );
  });

  it("rejects invalid endpoint scheme", async () => {
    mocks.getUserIdFromRequest.mockReturnValue("u1");

    const request = new NextRequest("http://localhost/api/push/subscribe", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        subscription: {
          endpoint: "http://example.com/push",
          keys: {
            p256dh: "AbCd-123_xyz",
            auth: "QwEr-987_poi",
          },
        },
      }),
    });

    const response = await POST_PUSH_SUBSCRIBE(request);
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.message).toContain("https");
  });
});
