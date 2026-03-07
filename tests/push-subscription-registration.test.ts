import { describe, expect, it, vi } from "vitest";
import {
  ensurePushSubscriptionRegistered,
  postPushSubscription,
} from "@/lib/push-subscription-registration";

describe("push subscription registration", () => {
  it("reuses an existing browser subscription before trying to create a new one", async () => {
    const existingSubscription = {
      endpoint: "https://push.example/existing",
      toJSON: vi.fn(() => ({ endpoint: "https://push.example/existing" })),
      unsubscribe: vi.fn(async () => true),
    };

    const pushManager = {
      getSubscription: vi.fn(async () => existingSubscription),
      subscribe: vi.fn(),
    };
    const syncSubscription = vi.fn(async () => undefined);

    const subscription = await ensurePushSubscriptionRegistered({
      pushManager,
      applicationServerKey: new Uint8Array([1, 2, 3]),
      syncSubscription,
    });

    expect(subscription).toBe(existingSubscription);
    expect(pushManager.subscribe).not.toHaveBeenCalled();
    expect(syncSubscription).toHaveBeenCalledWith({
      endpoint: "https://push.example/existing",
    });
  });

  it("rolls back a newly created browser subscription when server sync fails", async () => {
    const createdSubscription = {
      endpoint: "https://push.example/new",
      toJSON: vi.fn(() => ({ endpoint: "https://push.example/new" })),
      unsubscribe: vi.fn(async () => true),
    };

    const pushManager = {
      getSubscription: vi.fn(async () => null),
      subscribe: vi.fn(async () => createdSubscription),
    };
    const syncSubscription = vi.fn(async () => {
      throw new Error("sync failed");
    });

    await expect(
      ensurePushSubscriptionRegistered({
        pushManager,
        applicationServerKey: new Uint8Array([4, 5, 6]),
        syncSubscription,
      }),
    ).rejects.toThrow("sync failed");

    expect(pushManager.subscribe).toHaveBeenCalledOnce();
    expect(createdSubscription.unsubscribe).toHaveBeenCalledOnce();
  });

  it("treats non-2xx subscribe sync responses as errors", async () => {
    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify({ message: "subscription sync failed" }), {
        status: 500,
        headers: {
          "Content-Type": "application/json",
        },
      }),
    );

    await expect(
      postPushSubscription(fetchMock, {
        endpoint: "https://push.example/new",
      }),
    ).rejects.toThrow("subscription sync failed");
  });
});
