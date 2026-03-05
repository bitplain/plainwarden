export const AI_THEME_KEY = "netden:ai-theme";
export const AI_THEME_CHANGED_EVENT = "netden:ai-theme-changed";

export type AiTheme = "cyber" | "ambient" | "terminal";

export function isAiTheme(value: unknown): value is AiTheme {
  return value === "cyber" || value === "ambient" || value === "terminal";
}

export function readAiTheme(): AiTheme {
  if (typeof window === "undefined") {
    return "cyber";
  }
  const stored = window.localStorage.getItem(AI_THEME_KEY);
  return isAiTheme(stored) ? stored : "cyber";
}

export function saveAiTheme(theme: AiTheme): void {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(AI_THEME_KEY, theme);
  window.dispatchEvent(new CustomEvent<AiTheme>(AI_THEME_CHANGED_EVENT, { detail: theme }));
}

export function subscribeAiTheme(onChange: (theme: AiTheme) => void): () => void {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  const handler = (event: Event) => {
    const detail = (event as CustomEvent<unknown>).detail;
    if (isAiTheme(detail)) {
      onChange(detail);
    } else {
      onChange(readAiTheme());
    }
  };

  window.addEventListener(AI_THEME_CHANGED_EVENT, handler);
  window.addEventListener("storage", handler);

  return () => {
    window.removeEventListener(AI_THEME_CHANGED_EVENT, handler);
    window.removeEventListener("storage", handler);
  };
}
