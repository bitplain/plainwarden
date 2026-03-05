import { describe, expect, it } from "vitest";
import { parsePushForegroundMessage } from "@/lib/push-foreground";

describe("parsePushForegroundMessage", () => {
  it("parses valid service worker foreground push payload", () => {
    const parsed = parsePushForegroundMessage({
      type: "netden-push-foreground",
      payload: {
        title: "NetDen test",
        body: "Push body",
        navigateTo: "/settings",
        tag: "push-test:123",
      },
    });

    expect(parsed).toEqual({
      title: "NetDen test",
      body: "Push body",
      navigateTo: "/settings",
      tag: "push-test:123",
    });
  });

  it("returns null for unrelated messages", () => {
    expect(parsePushForegroundMessage({ type: "other-message" })).toBeNull();
    expect(parsePushForegroundMessage(null)).toBeNull();
  });
});
