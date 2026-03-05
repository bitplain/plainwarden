import { describe, expect, it } from "vitest";
import {
  classifyPushError,
  summarizePushDelivery,
} from "@/lib/server/push-delivery";

describe("push delivery classification", () => {
  it("classifies 404/410 as permanent errors", () => {
    expect(classifyPushError({ statusCode: 404 }).failureClass).toBe("permanent");
    expect(classifyPushError({ statusCode: 410 }).failureClass).toBe("permanent");
  });

  it("classifies 429/5xx as transient errors", () => {
    expect(classifyPushError({ statusCode: 429 }).failureClass).toBe("transient");
    expect(classifyPushError({ statusCode: 503 }).failureClass).toBe("transient");
  });

  it("reports no-active-subscriptions status", () => {
    const summary = summarizePushDelivery({
      sent: 0,
      failed: 0,
      inactive: 0,
      transientFailed: 0,
      permanentFailed: 0,
      hasActiveSubscriptions: false,
    });

    expect(summary.deliveryStatus).toBe("no-active-subscriptions");
    expect(summary.reason).toBe("no-active-subscriptions");
    expect(summary.retryRecommended).toBe(false);
  });

  it("reports transient send failure with retry hint", () => {
    const summary = summarizePushDelivery({
      sent: 0,
      failed: 2,
      inactive: 0,
      transientFailed: 2,
      permanentFailed: 0,
      hasActiveSubscriptions: true,
    });

    expect(summary.deliveryStatus).toBe("send-failed");
    expect(summary.reason).toBe("transient-failure");
    expect(summary.retryRecommended).toBe(true);
  });

  it("reports delivered status when at least one push is sent", () => {
    const summary = summarizePushDelivery({
      sent: 1,
      failed: 0,
      inactive: 0,
      transientFailed: 0,
      permanentFailed: 0,
      hasActiveSubscriptions: true,
    });

    expect(summary.deliveryStatus).toBe("delivered");
    expect(summary.reason).toBe("ok");
    expect(summary.retryRecommended).toBe(false);
  });
});
