import { afterEach, describe, expect, it } from "vitest";
import {
  DEFAULT_UI_PREFERENCES,
  normalizeUiPreferences,
  readRememberedDesktopSidebarState,
  resolveDesktopSidebarInitialState,
  type UiPreferences,
} from "@/components/settings/settings-ui-preferences";

class MemoryStorage {
  private readonly data = new Map<string, string>();

  getItem(key: string): string | null {
    return this.data.has(key) ? this.data.get(key)! : null;
  }

  setItem(key: string, value: string): void {
    this.data.set(key, value);
  }
}

const originalWindow = globalThis.window;

afterEach(() => {
  if (originalWindow === undefined) {
    delete (globalThis as { window?: unknown }).window;
  } else {
    (globalThis as { window?: Window }).window = originalWindow;
  }
});

describe("normalizeUiPreferences", () => {
  it("returns defaults for invalid values", () => {
    const value = normalizeUiPreferences({
      density: "wide",
      motion: "fast",
      sidebarRemember: "yes",
      sidebarDefaultDesktop: "left",
    });

    expect(value).toEqual(DEFAULT_UI_PREFERENCES);
  });

  it("accepts valid preferences shape", () => {
    const value = normalizeUiPreferences({
      density: "compact",
      motion: "reduced",
      sidebarRemember: false,
      sidebarDefaultDesktop: "closed",
    });

    expect(value).toEqual<UiPreferences>({
      density: "compact",
      motion: "reduced",
      sidebarRemember: false,
      sidebarDefaultDesktop: "closed",
    });
  });
});

describe("resolveDesktopSidebarInitialState", () => {
  it("uses remembered sidebar state when remember is enabled", () => {
    const storage = new MemoryStorage();
    storage.setItem("netden:ui:sidebar:last-desktop:v1", "closed");
    (globalThis as { window?: unknown }).window = {
      localStorage: storage,
    };

    expect(readRememberedDesktopSidebarState()).toBe(false);
    expect(
      resolveDesktopSidebarInitialState({
        density: "comfortable",
        motion: "standard",
        sidebarRemember: true,
        sidebarDefaultDesktop: "open",
      }),
    ).toBe(false);
  });

  it("falls back to desktop default when remember is disabled", () => {
    const storage = new MemoryStorage();
    storage.setItem("netden:ui:sidebar:last-desktop:v1", "closed");
    (globalThis as { window?: unknown }).window = {
      localStorage: storage,
    };

    expect(
      resolveDesktopSidebarInitialState({
        density: "comfortable",
        motion: "standard",
        sidebarRemember: false,
        sidebarDefaultDesktop: "open",
      }),
    ).toBe(true);
  });
});
