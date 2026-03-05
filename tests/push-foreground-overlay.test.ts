import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { PushForegroundToastViewport } from "@/components/PushForegroundOverlay";

describe("PushForegroundToastViewport", () => {
  it("renders visible push toast content", () => {
    const html = renderToStaticMarkup(
      React.createElement(PushForegroundToastViewport, {
        items: [
          {
            id: "toast-1",
            title: "NetDen test",
            body: "Push body",
            navigateTo: "/settings",
            tag: "push-test:123",
          },
        ],
        onClose: vi.fn(),
        onOpen: vi.fn(),
      }),
    );

    expect(html).toContain("NetDen test");
    expect(html).toContain("Push body");
    expect(html).toContain("Открыть");
  });
});
