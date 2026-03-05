import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/server/auth", () => ({
  getUserIdFromRequest: vi.fn(() => "u1"),
}));

vi.mock("@/lib/server/push-runtime-config", () => ({
  autoSetupPushRuntimeConfig: vi.fn(async () => ({
    generatedPushConfig: true,
    generatedCronSecret: true,
    vapidPublicKey: "BAbcdEF_12345-test-public-key",
    subject: "mailto:admin@netden.local",
    cronSecret: "generated-secret",
  })),
}));

import { POST as POST_PUSH_SETUP } from "@/app/api/push/setup/route";

describe("POST /api/push/setup", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns generated runtime config payload", async () => {
    const request = new NextRequest("http://localhost/api/push/setup", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ subject: "mailto:test@example.com" }),
    });

    const response = await POST_PUSH_SETUP(request);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.ok).toBe(true);
    expect(payload.generatedPushConfig).toBe(true);
    expect(payload.generatedCronSecret).toBe(true);
    expect(payload.cronSecret).toBe("generated-secret");
  });
});
