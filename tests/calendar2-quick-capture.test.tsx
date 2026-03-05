import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import QuickCaptureDialog from "@/components/calendar2/QuickCaptureDialog";

describe("QuickCaptureDialog", () => {
  it("renders one-line input when open", () => {
    const html = renderToStaticMarkup(
      React.createElement(QuickCaptureDialog, {
        open: true,
        onClose: () => undefined,
        onSave: () => undefined,
      }),
    );

    expect(html).toContain("Quick Capture");
    expect(html).toContain("Запиши мысль, задачу или заметку");
  });
});
