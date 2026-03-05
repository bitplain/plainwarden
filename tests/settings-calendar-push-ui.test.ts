import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/hooks/usePushNotifications", () => ({
  usePushNotifications: () => ({
    supported: true,
    permission: "default",
    isSubscribed: false,
    isBusy: false,
    diagnostics: {
      configured: false,
      missing: ["VAPID_SUBJECT", "NEXT_PUBLIC_VAPID_PUBLIC_KEY"],
      invalid: [],
      cronConfigured: false,
      source: "none",
      isLoading: false,
      error: null,
    },
    subscribe: async () => ({ ok: true, message: "ok" }),
    unsubscribe: async () => ({ ok: true, message: "ok" }),
    sendTest: async () => ({ ok: true, message: "ok" }),
    recheck: async () => undefined,
    autoSetup: async () => ({ ok: true, message: "ok", cronSecret: null }),
  }),
}));

import SettingsCalendarTab from "@/components/settings/SettingsCalendarTab";

describe("SettingsCalendarTab push section", () => {
  it("renders push diagnostics and actions", () => {
    const html = renderToStaticMarkup(React.createElement(SettingsCalendarTab));

    expect(html).toContain("Push Notifications");
    expect(html).toContain("Enable push");
    expect(html).toContain("Disable push");
    expect(html).toContain("Send test");
    expect(html).toContain("Recheck");
    expect(html).toContain("Auto setup push");
    expect(html).toContain("VAPID_SUBJECT");
    expect(html).toContain("NEXT_PUBLIC_VAPID_PUBLIC_KEY");
  });
});
