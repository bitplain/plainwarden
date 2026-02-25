import { describe, expect, test } from "vitest";
import { getAcmeRenewalMonitor, isAcmeProbeRefreshDue } from "@/lib/server/acme";

describe("acme renewal monitor", () => {
  test("returns healthy when certificate has enough remaining days", () => {
    const now = new Date("2026-02-25T00:00:00.000Z").getTime();
    const expires = "2026-05-25T00:00:00.000Z";

    const monitor = getAcmeRenewalMonitor(expires, 30, now);
    expect(monitor.state).toBe("healthy");
    expect(monitor.daysUntilExpiry).toBeGreaterThan(30);
  });

  test("returns renewal_due in renewal window", () => {
    const now = new Date("2026-02-25T00:00:00.000Z").getTime();
    const expires = "2026-03-10T00:00:00.000Z";

    const monitor = getAcmeRenewalMonitor(expires, 30, now);
    expect(monitor.state).toBe("renewal_due");
  });

  test("returns expired if cert date in the past", () => {
    const now = new Date("2026-02-25T00:00:00.000Z").getTime();
    const expires = "2026-02-20T00:00:00.000Z";

    const monitor = getAcmeRenewalMonitor(expires, 30, now);
    expect(monitor.state).toBe("expired");
  });
});

describe("acme probe refresh policy", () => {
  test("requires refresh for active cert without previous probe", () => {
    const due = isAcmeProbeRefreshDue({
      domain: "site.example.com",
      status: "active",
      lastProbeAt: null,
    });
    expect(due).toBe(true);
  });

  test("does not require refresh before interval", () => {
    const now = new Date("2026-02-25T12:00:00.000Z").getTime();
    const due = isAcmeProbeRefreshDue(
      {
        domain: "site.example.com",
        status: "active",
        lastProbeAt: "2026-02-25T08:00:00.000Z",
      },
      now,
      12 * 60 * 60 * 1000,
    );
    expect(due).toBe(false);
  });
});
