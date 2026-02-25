import { describe, expect, it } from "vitest";
import { aggregateGitHubBillingUsage } from "@/lib/server/github-billing";

describe("aggregateGitHubBillingUsage", () => {
  it("aggregates copilot premium, actions and codespaces from summary payload", () => {
    const result = aggregateGitHubBillingUsage({
      summary: {
        totalUsage: [
          {
            product: "GitHub Actions",
            sku: "actions-linux",
            quantity: 120,
            unitType: "minutes",
            netAmount: 6.4,
          },
          {
            product: "GitHub Codespaces",
            sku: "codespaces",
            quantity: 18,
            unitType: "hours",
            netAmount: 12.1,
          },
          {
            product: "Copilot Premium Requests",
            sku: "copilot-premium-requests",
            quantity: 42,
            unitType: "requests",
            netAmount: 2.8,
          },
        ],
      },
    });

    expect(result.actions.quantity).toBe(120);
    expect(result.actions.unit).toBe("minutes");
    expect(result.actions.netAmount).toBe(6.4);

    expect(result.codespaces.quantity).toBe(18);
    expect(result.codespaces.unit).toBe("hours");
    expect(result.codespaces.netAmount).toBe(12.1);

    expect(result.copilotPremium.quantity).toBe(42);
    expect(result.copilotPremium.unit).toBe("requests");
    expect(result.copilotPremium.netAmount).toBe(2.8);
  });

  it("matches rows case-insensitively and supports fallback arrays", () => {
    const result = aggregateGitHubBillingUsage({
      usage: [
        { product: "ACTIONS", quantity: 4, unitType: "minutes", netAmount: 1.2 },
        { product: "codespaces storage", quantity: 7, unitType: "gb", netAmount: 0.7 },
        { sku: "COPILOT PREMIUM", quantity: 3, unitType: "requests", netAmount: 0.4 },
      ],
    });

    expect(result.actions.quantity).toBe(4);
    expect(result.codespaces.quantity).toBe(7);
    expect(result.copilotPremium.quantity).toBe(3);
  });
});
