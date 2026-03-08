import type { CSSProperties } from "react";
import type { AiTheme } from "@/components/ai-theme";

export interface AiThemePalette {
  canvas: string;
  surface: string;
  surfaceElevated: string;
  border: string;
  borderStrong: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  textDim: string;
  accent: string;
  accentSoft: string;
  accentStrong: string;
  accentGlow: string;
}

type AiThemeStyles = CSSProperties & Record<`--ai-${string}`, string>;

const SHARED_SHELL: Omit<
  AiThemePalette,
  "accent" | "accentSoft" | "accentStrong" | "accentGlow"
> = {
  canvas: "#0d0d0f",
  surface: "#161618",
  surfaceElevated: "rgba(255,255,255,0.03)",
  border: "rgba(255,255,255,0.08)",
  borderStrong: "rgba(255,255,255,0.12)",
  textPrimary: "#f5f7fb",
  textSecondary: "rgba(255,255,255,0.72)",
  textMuted: "rgba(255,255,255,0.52)",
  textDim: "rgba(255,255,255,0.34)",
};

const AI_THEME_ACCENTS: Record<
  AiTheme,
  Pick<AiThemePalette, "accent" | "accentSoft" | "accentStrong" | "accentGlow">
> = {
  cyber: {
    accent: "#5E6AD2",
    accentSoft: "rgba(94,106,210,0.18)",
    accentStrong: "rgba(94,106,210,0.28)",
    accentGlow: "rgba(94,106,210,0.34)",
  },
  ambient: {
    accent: "#F59E0B",
    accentSoft: "rgba(245,158,11,0.18)",
    accentStrong: "rgba(245,158,11,0.28)",
    accentGlow: "rgba(245,158,11,0.32)",
  },
  terminal: {
    accent: "#22C55E",
    accentSoft: "rgba(34,197,94,0.18)",
    accentStrong: "rgba(34,197,94,0.28)",
    accentGlow: "rgba(34,197,94,0.32)",
  },
};

export function getAiThemePalette(theme: AiTheme): AiThemePalette {
  return {
    ...SHARED_SHELL,
    ...AI_THEME_ACCENTS[theme],
  };
}

export function getAiThemeStyles(theme: AiTheme): AiThemeStyles {
  const palette = getAiThemePalette(theme);

  return {
    "--ai-canvas": palette.canvas,
    "--ai-surface": palette.surface,
    "--ai-surface-elevated": palette.surfaceElevated,
    "--ai-border": palette.border,
    "--ai-border-strong": palette.borderStrong,
    "--ai-text-primary": palette.textPrimary,
    "--ai-text-secondary": palette.textSecondary,
    "--ai-text-muted": palette.textMuted,
    "--ai-text-dim": palette.textDim,
    "--ai-accent": palette.accent,
    "--ai-accent-soft": palette.accentSoft,
    "--ai-accent-strong": palette.accentStrong,
    "--ai-accent-glow": palette.accentGlow,
  };
}

export function shouldSubmitAiComposerKey(input: {
  key: string;
  shiftKey: boolean;
  nativeIsComposing: boolean;
}): boolean {
  return input.key === "Enter" && !input.shiftKey && !input.nativeIsComposing;
}
