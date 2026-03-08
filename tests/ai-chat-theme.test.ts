import { describe, expect, test } from "vitest";
import { getAiThemePalette, shouldSubmitAiComposerKey } from "@/components/ai-chat/theme";

describe("ai chat theme palette", () => {
  test("keeps shared shell surfaces across all AI themes", () => {
    const cyber = getAiThemePalette("cyber");
    const ambient = getAiThemePalette("ambient");
    const terminal = getAiThemePalette("terminal");

    expect(cyber.surface).toBe("#161618");
    expect(cyber.canvas).toBe("#0d0d0f");
    expect(cyber.border).toBe("rgba(255,255,255,0.08)");

    expect(ambient.surface).toBe(cyber.surface);
    expect(ambient.canvas).toBe(cyber.canvas);
    expect(ambient.border).toBe(cyber.border);

    expect(terminal.surface).toBe(cyber.surface);
    expect(terminal.canvas).toBe(cyber.canvas);
    expect(terminal.border).toBe(cyber.border);
  });

  test("uses distinct accent identities for each preserved theme id", () => {
    const cyber = getAiThemePalette("cyber");
    const ambient = getAiThemePalette("ambient");
    const terminal = getAiThemePalette("terminal");

    expect(new Set([cyber.accent, ambient.accent, terminal.accent]).size).toBe(3);
    expect(cyber.accentSoft).not.toBe(cyber.accent);
    expect(ambient.accentSoft).not.toBe(ambient.accent);
    expect(terminal.accentSoft).not.toBe(terminal.accent);
  });
});

describe("shouldSubmitAiComposerKey", () => {
  test("submits on Enter without Shift when not composing", () => {
    expect(
      shouldSubmitAiComposerKey({
        key: "Enter",
        shiftKey: false,
        nativeIsComposing: false,
      }),
    ).toBe(true);
  });

  test("does not submit on Shift+Enter", () => {
    expect(
      shouldSubmitAiComposerKey({
        key: "Enter",
        shiftKey: true,
        nativeIsComposing: false,
      }),
    ).toBe(false);
  });

  test("does not submit while IME composition is active", () => {
    expect(
      shouldSubmitAiComposerKey({
        key: "Enter",
        shiftKey: false,
        nativeIsComposing: true,
      }),
    ).toBe(false);
  });

  test("ignores non-Enter keys", () => {
    expect(
      shouldSubmitAiComposerKey({
        key: "a",
        shiftKey: false,
        nativeIsComposing: false,
      }),
    ).toBe(false);
  });
});
