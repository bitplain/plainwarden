"use client";

import { useEffect, useState } from "react";
import AiThemePreviewCard from "@/components/ai-chat/AiThemePreviewCard";
import { AI_THEME_META } from "@/components/ai-chat/constants";
import {
  readAiTheme,
  saveAiTheme,
  subscribeAiTheme,
  type AiTheme,
} from "@/components/ai-theme";

const THEMES = Object.keys(AI_THEME_META) as AiTheme[];

export default function SettingsAiThemeTab() {
  const [theme, setTheme] = useState<AiTheme>(() => readAiTheme());

  useEffect(() => subscribeAiTheme(setTheme), []);

  const handleSelectTheme = (next: AiTheme) => {
    setTheme(next);
    saveAiTheme(next);
  };

  return (
    <div className="grid gap-4">
      <div className="space-y-2">
        <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--cal2-text-secondary)]">
          AI тема
        </p>
        <div className="max-w-[42rem] text-[13px] leading-[1.65] text-[var(--cal2-text-secondary)]">
          Темы больше не меняют сам язык интерфейса. Они только тонко сдвигают акцент внутри единого тёмного product-shell, согласованного с календарём и настройками.
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {THEMES.map((item) => (
          <AiThemePreviewCard
            key={item}
            theme={item}
            active={theme === item}
            onSelect={handleSelectTheme}
          />
        ))}
      </div>
    </div>
  );
}
