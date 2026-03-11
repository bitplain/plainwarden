import type { CSSProperties } from "react";
import type { AiTheme } from "@/components/ai-theme";
import { getAiThemePalette, getAiThemeStyles } from "@/components/ai-chat/theme";

type AiIThemeStyles = CSSProperties &
  Record<`--ai-${string}`, string> &
  Record<`--ai-i-${string}`, string>;

export function getAiIThemeStyles(theme: AiTheme): AiIThemeStyles {
  const palette = getAiThemePalette(theme);

  return {
    ...getAiThemeStyles(theme),
    "--ai-i-shell": "rgba(19,20,25,0.92)",
    "--ai-i-shell-border": "rgba(255,255,255,0.12)",
    "--ai-i-shell-text": "rgba(245,247,251,0.98)",
    "--ai-i-shell-muted": "rgba(214,219,231,0.68)",
    "--ai-i-divider": `${palette.accent}99`,
    "--ai-i-stage-top": "#d0c0de",
    "--ai-i-stage-mid": "#deb9cc",
    "--ai-i-stage-bottom": "#ff9700",
    "--ai-i-stage-glow": palette.accentGlow,
  };
}
