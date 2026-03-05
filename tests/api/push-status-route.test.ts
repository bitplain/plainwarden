import { afterEach, describe, expect, it } from "vitest";
import { GET as GET_PUSH_STATUS } from "@/app/api/push/status/route";

const ORIGINAL_ENV = {
  VAPID_SUBJECT: process.env.VAPID_SUBJECT,
  NEXT_PUBLIC_VAPID_PUBLIC_KEY: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY: process.env.VAPID_PRIVATE_KEY,
  NETDEN_CRON_SECRET: process.env.NETDEN_CRON_SECRET,
};

function restoreEnv() {
  if (typeof ORIGINAL_ENV.VAPID_SUBJECT === "string") {
    process.env.VAPID_SUBJECT = ORIGINAL_ENV.VAPID_SUBJECT;
  } else {
    delete process.env.VAPID_SUBJECT;
  }

  if (typeof ORIGINAL_ENV.NEXT_PUBLIC_VAPID_PUBLIC_KEY === "string") {
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = ORIGINAL_ENV.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  } else {
    delete process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  }

  if (typeof ORIGINAL_ENV.VAPID_PRIVATE_KEY === "string") {
    process.env.VAPID_PRIVATE_KEY = ORIGINAL_ENV.VAPID_PRIVATE_KEY;
  } else {
    delete process.env.VAPID_PRIVATE_KEY;
  }

  if (typeof ORIGINAL_ENV.NETDEN_CRON_SECRET === "string") {
    process.env.NETDEN_CRON_SECRET = ORIGINAL_ENV.NETDEN_CRON_SECRET;
  } else {
    delete process.env.NETDEN_CRON_SECRET;
  }
}

describe("GET /api/push/status", () => {
  afterEach(() => {
    restoreEnv();
  });

  it("returns missing list when env is not configured", async () => {
    delete process.env.VAPID_SUBJECT;
    delete process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    delete process.env.VAPID_PRIVATE_KEY;
    delete process.env.NETDEN_CRON_SECRET;

    const response = await GET_PUSH_STATUS();
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.configured).toBe(false);
    expect(payload.supported).toBe(false);
    expect(payload.missing).toEqual([
      "VAPID_SUBJECT",
      "NEXT_PUBLIC_VAPID_PUBLIC_KEY",
      "VAPID_PRIVATE_KEY",
    ]);
    expect(payload.vapidPublicKey).toBe("");
    expect(payload.cronConfigured).toBe(false);
  });

  it("returns configured=true and runtime public key when env is set", async () => {
    process.env.VAPID_SUBJECT = "mailto:admin@example.com";
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = "BAbcdEF_12345-test-public-key";
    process.env.VAPID_PRIVATE_KEY = "xyz_PRIVATE-12345";
    process.env.NETDEN_CRON_SECRET = "super-secret";

    const response = await GET_PUSH_STATUS();
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.configured).toBe(true);
    expect(payload.supported).toBe(true);
    expect(payload.missing).toEqual([]);
    expect(payload.invalid).toEqual([]);
    expect(payload.vapidPublicKey).toBe("BAbcdEF_12345-test-public-key");
    expect(payload.cronConfigured).toBe(true);
  });
});
