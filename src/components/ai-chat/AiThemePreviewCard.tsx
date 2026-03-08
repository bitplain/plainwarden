"use client";

import type { AiTheme } from "@/components/ai-theme";
import { AI_THEME_META } from "@/components/ai-chat/constants";
import { getAiThemeStyles } from "@/components/ai-chat/theme";

interface AiThemePreviewCardProps {
  theme: AiTheme;
  active: boolean;
  onSelect: (theme: AiTheme) => void;
}

export default function AiThemePreviewCard({
  theme,
  active,
  onSelect,
}: AiThemePreviewCardProps) {
  const meta = AI_THEME_META[theme];

  return (
    <button
      type="button"
      onClick={() => onSelect(theme)}
      style={getAiThemeStyles(theme)}
      className={`group relative overflow-hidden rounded-[18px] border text-left transition-all duration-200 ${
        active
          ? "border-[var(--ai-accent)] bg-[var(--ai-surface)] shadow-[0_24px_48px_-30px_var(--ai-accent-glow)]"
          : "border-[var(--ai-border)] bg-[var(--ai-surface)] hover:border-[var(--ai-border-strong)] hover:-translate-y-0.5"
      }`}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,var(--ai-accent-soft),transparent_38%),linear-gradient(180deg,rgba(255,255,255,0.03),transparent_18%)]" />
      <div className="relative flex flex-col gap-4 p-4">
        <div className="overflow-hidden rounded-[14px] border border-[var(--ai-border)] bg-[var(--ai-canvas)] p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-full border border-[var(--ai-border)] bg-[var(--ai-accent-soft)] text-[11px] font-semibold text-[var(--ai-text-primary)]">
                AI
              </span>
              <div>
                <div className="text-[11px] font-medium text-[var(--ai-text-primary)]">Ассистент</div>
                <div className="text-[10px] text-[var(--ai-text-muted)]">Единый product shell</div>
              </div>
            </div>
            <span className="rounded-full border border-[var(--ai-border)] bg-black/20 px-2 py-1 text-[9px] uppercase tracking-[0.16em] text-[var(--ai-text-muted)]">
              {theme}
            </span>
          </div>

          <div className="mt-3 space-y-2">
            <div className="rounded-[14px] border border-[var(--ai-border)] bg-white/[0.02] px-3 py-2.5 text-[11px] text-[var(--ai-text-secondary)]">
              Покажи дедлайны на ближайшие 3 дня
            </div>
            <div className="rounded-[14px] border border-[var(--ai-border)] bg-[var(--ai-accent-soft)] px-3 py-2.5 text-[11px] text-[var(--ai-text-primary)]">
              Найду события, задачи и напомню, где нужен фокус.
            </div>
          </div>

          <div className="mt-3 flex items-center gap-2 rounded-[16px] border border-[var(--ai-border)] bg-white/[0.02] px-3 py-2">
            <div className="h-2 w-2 rounded-full bg-[var(--ai-accent)] shadow-[0_0_10px_var(--ai-accent-glow)]" />
            <div className="h-2 flex-1 rounded-full bg-white/[0.06]" />
            <div className="h-8 w-8 rounded-full bg-[var(--ai-accent)]" />
          </div>
        </div>

        <div className="space-y-1">
          <div className="flex items-center justify-between gap-3">
            <span className="text-[13px] font-semibold text-[var(--ai-text-primary)]">{meta.label}</span>
            {active ? (
              <span className="rounded-full border border-[var(--ai-border)] bg-[var(--ai-accent-soft)] px-2 py-1 text-[10px] font-medium text-[var(--ai-text-primary)]">
                Активна
              </span>
            ) : null}
          </div>
          <p className="text-[12px] leading-[1.45] text-[var(--ai-text-muted)]">{meta.description}</p>
        </div>
      </div>
    </button>
  );
}
