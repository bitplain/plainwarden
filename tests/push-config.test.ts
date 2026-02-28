import { describe, expect, it } from "vitest";
import {
  PushConfigurationError,
  assertPushConfiguration,
  getPushConfigurationStatus,
} from "@/lib/server/push-config";

describe("push configuration", () => {
  it("reports missing VAPID env vars", () => {
    const status = getPushConfigurationStatus({});

    expect(status.configured).toBe(false);
    expect(status.missing).toEqual([
      "VAPID_SUBJECT",
      "NEXT_PUBLIC_VAPID_PUBLIC_KEY",
      "VAPID_PRIVATE_KEY",
    ]);
    expect(status.invalid).toEqual([]);
  });

  it("reports invalid VAPID subject format", () => {
    const status = getPushConfigurationStatus({
      VAPID_SUBJECT: "admin@example.com",
      NEXT_PUBLIC_VAPID_PUBLIC_KEY: "pub_key",
      VAPID_PRIVATE_KEY: "priv_key",
    });

    expect(status.configured).toBe(false);
    expect(status.missing).toEqual([]);
    expect(status.invalid).toContain("VAPID_SUBJECT");
  });

  it("throws PushConfigurationError when config is incomplete", () => {
    expect(() =>
      assertPushConfiguration({
        VAPID_SUBJECT: "mailto:admin@example.com",
      }),
    ).toThrow(PushConfigurationError);
  });

  it("returns normalized config when env is valid", () => {
    const config = assertPushConfiguration({
      VAPID_SUBJECT: "mailto:admin@example.com",
      NEXT_PUBLIC_VAPID_PUBLIC_KEY: "BAbcdEF_12345-test-public-key",
      VAPID_PRIVATE_KEY: "xyz_PRIVATE-12345",
    });

    expect(config.subject).toBe("mailto:admin@example.com");
    expect(config.publicKey).toBe("BAbcdEF_12345-test-public-key");
    expect(config.privateKey).toBe("xyz_PRIVATE-12345");
  });
});
