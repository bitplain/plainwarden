import { describe, expect, test } from "vitest";
import { buildCaddyAcmeConfig, normalizeDomain } from "@/lib/server/acme";

describe("acme caddy config", () => {
  test("normalizes domain to lowercase and strips trailing dot", () => {
    expect(normalizeDomain("Example.COM.")).toBe("example.com");
  });

  test("builds caddy config with :80/:443 and reverse proxy upstream", () => {
    const cfg = buildCaddyAcmeConfig({
      domain: "example.com",
      email: "admin@example.com",
      upstream: "app:3000",
    });

    const apps = (
      cfg as {
        apps?: {
          http?: { servers?: { srv0?: { listen?: string[]; routes?: unknown[] } } };
          tls?: unknown;
        };
      }
    ).apps;

    expect(apps?.http?.servers?.srv0?.listen).toEqual([":80", ":443"]);
    expect(JSON.stringify(cfg)).toContain("app:3000");
    expect(JSON.stringify(cfg)).toContain("acme");
    expect(JSON.stringify(cfg)).toContain("example.com");
  });
});
