import { describe, expect, it } from "vitest";

describe("POST /api/setup/emergency/reset", () => {
  it("returns 410 and directs to factory reset flow", async () => {
    const { POST } = await import("@/app/api/setup/emergency/reset/route");

    const response = await POST();
    const payload = await response.json();

    expect(response.status).toBe(410);
    expect(payload).toEqual({
      error: "Emergency password reset is disabled. Use /api/setup/emergency/factory-reset",
      canFactoryReset: true,
      reasonCode: "legacy_endpoint_disabled",
    });
  });
});
