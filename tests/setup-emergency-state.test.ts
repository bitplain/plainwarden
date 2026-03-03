import { describe, expect, it } from "vitest";

describe("GET /api/setup/emergency/state", () => {
  it("returns 410 and directs to factory reset flow", async () => {
    const { GET } = await import("@/app/api/setup/emergency/state/route");

    const response = await GET();
    const payload = await response.json();

    expect(response.status).toBe(410);
    expect(payload).toEqual({
      error: "Emergency account recovery is disabled. Use /api/setup/emergency/factory-reset",
      canFactoryReset: true,
      reasonCode: "legacy_endpoint_disabled",
    });
  });
});
