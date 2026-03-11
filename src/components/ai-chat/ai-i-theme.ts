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
    "--ai-i-shell": "rgba(17,18,22,0.94)",
    "--ai-i-shell-border": "rgba(255,255,255,0.08)",
    "--ai-i-shell-text": "rgba(245,247,251,0.98)",
    "--ai-i-shell-muted": "rgba(214,219,231,0.62)",
    "--ai-i-divider": "rgba(94,106,210,0.6)",
    "--ai-i-stage-top": "#12131a",
    "--ai-i-stage-mid": "#111218",
    "--ai-i-stage-bottom": "rgba(181,124,52,0.56)",
    "--ai-i-stage-glow": palette.accentGlow,
  };
}
