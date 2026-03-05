export type UiDensity = "comfortable" | "compact";
export type UiMotion = "standard" | "reduced";
export type UiSidebarDefaultDesktop = "open" | "closed";

export interface UiPreferences {
  density: UiDensity;
  motion: UiMotion;
  sidebarRemember: boolean;
  sidebarDefaultDesktop: UiSidebarDefaultDesktop;
}

export const UI_PREFERENCES_STORAGE_KEY = "netden:ui:preferences:v1";
export const UI_PREFERENCES_UPDATED_EVENT = "netden:ui-preferences-updated";
const UI_SIDEBAR_LAST_DESKTOP_STATE_KEY = "netden:ui:sidebar:last-desktop:v1";

export const DEFAULT_UI_PREFERENCES: UiPreferences = {
  density: "comfortable",
  motion: "standard",
  sidebarRemember: true,
  sidebarDefaultDesktop: "open",
};

function asRecord(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === "object") {
    return value as Record<string, unknown>;
  }
  return null;
}

function parseBoolean(value: unknown, fallback: boolean): boolean {
  if (typeof value === "boolean") {
    return value;
  }
  return fallback;
}

export function normalizeUiPreferences(raw: unknown): UiPreferences {
  const record = asRecord(raw);
  if (!record) {
    return { ...DEFAULT_UI_PREFERENCES };
  }

  const density = record.density === "compact" ? "compact" : "comfortable";
  const motion = record.motion === "reduced" ? "reduced" : "standard";
  const sidebarDefaultDesktop =
    record.sidebarDefaultDesktop === "closed" ? "closed" : "open";

  return {
    density,
    motion,
    sidebarRemember: parseBoolean(record.sidebarRemember, DEFAULT_UI_PREFERENCES.sidebarRemember),
    sidebarDefaultDesktop,
  };
}

export function readUiPreferences(): UiPreferences {
  if (typeof window === "undefined") {
    return { ...DEFAULT_UI_PREFERENCES };
  }

  try {
    const raw = window.localStorage.getItem(UI_PREFERENCES_STORAGE_KEY);
    if (!raw) {
      return { ...DEFAULT_UI_PREFERENCES };
    }
    return normalizeUiPreferences(JSON.parse(raw));
  } catch {
    return { ...DEFAULT_UI_PREFERENCES };
  }
}

export function saveUiPreferences(preferences: UiPreferences): void {
  if (typeof window === "undefined") {
    return;
  }

  const normalized = normalizeUiPreferences(preferences);
  window.localStorage.setItem(UI_PREFERENCES_STORAGE_KEY, JSON.stringify(normalized));
  window.dispatchEvent(new Event(UI_PREFERENCES_UPDATED_EVENT));
}

function parseSidebarState(raw: string | null): boolean | null {
  if (raw === "open") {
    return true;
  }
  if (raw === "closed") {
    return false;
  }
  return null;
}

export function readRememberedDesktopSidebarState(): boolean | null {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    return parseSidebarState(window.localStorage.getItem(UI_SIDEBAR_LAST_DESKTOP_STATE_KEY));
  } catch {
    return null;
  }
}

export function saveRememberedDesktopSidebarState(isOpen: boolean): void {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(UI_SIDEBAR_LAST_DESKTOP_STATE_KEY, isOpen ? "open" : "closed");
  window.dispatchEvent(new Event(UI_PREFERENCES_UPDATED_EVENT));
}

export function resolveDesktopSidebarInitialState(preferences: UiPreferences): boolean {
  if (preferences.sidebarRemember) {
    const remembered = readRememberedDesktopSidebarState();
    if (remembered !== null) {
      return remembered;
    }
  }
  return preferences.sidebarDefaultDesktop === "open";
}

export function subscribeUiPreferences(onUpdate: (next: UiPreferences) => void): () => void {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  const handleUpdate = () => {
    onUpdate(readUiPreferences());
  };

  window.addEventListener(UI_PREFERENCES_UPDATED_EVENT, handleUpdate);
  window.addEventListener("storage", handleUpdate);

  return () => {
    window.removeEventListener(UI_PREFERENCES_UPDATED_EVENT, handleUpdate);
    window.removeEventListener("storage", handleUpdate);
  };
}
