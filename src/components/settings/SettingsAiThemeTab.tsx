"use client";

import { useState } from "react";

const AI_THEME_KEY = "netden:ai-theme";

type AiTheme = "cyber" | "ambient" | "terminal";

const THEMES: { id: AiTheme; label: string; description: string; colors: string[] }[] = [
  {
    id: "cyber",
    label: "Cyber Pulse",
    description: "Неоновый кибер-стиль с cyan акцентом и пульсирующими свечениями",
    colors: ["#38bdf8", "#8b5cf6", "#10b981"],
  },
  {
    id: "ambient",
    label: "Ambient Flow",
    description: "Тёплая органика с amber акцентом и мягкими mesh-градиентами",
    colors: ["#f59e0b", "#f472b6", "#10b981"],
  },
  {
    id: "terminal",
    label: "Terminal AI",
    description: "Ретро-терминал с зелёным фосфором и scan-lines эффектом",
    colors: ["#22c55e", "#22c55e", "#f59e0b"],
  },
];

export default function SettingsAiThemeTab() {
  const [theme, setTheme] = useState<AiTheme>(() => {
    if (typeof window === "undefined") return "cyber";
    const stored = window.localStorage.getItem(AI_THEME_KEY);
    if (stored === "cyber" || stored === "ambient" || stored === "terminal") return stored;
    return "cyber";
  });

  const saveTheme = (next: AiTheme) => {
    setTheme(next);
    window.localStorage.setItem(AI_THEME_KEY, next);
    window.dispatchEvent(new CustomEvent("netden:ai-theme-changed", { detail: next }));
  };

  return (
    <div>
      <h2 className="settings-tab-section-title">Тема AI-виджета</h2>
      <p className="settings-tab-muted" style={{ marginBottom: 16 }}>
        Выберите визуальный стиль AI-ассистента
      </p>
      <div className="aip-theme-grid">
        {THEMES.map((t) => (
          <button
            key={t.id}
            type="button"
            className={`aip-theme-card ${theme === t.id ? "aip-theme-card-active" : ""}`}
            onClick={() => saveTheme(t.id)}
            data-aip-theme-preview={t.id}
          >
            {/* Preview area */}
            <div className="aip-theme-preview">
              <div className="aip-theme-preview-bar">
                <span className="aip-theme-preview-dot-sm" style={{ background: t.colors[0] }} />
                <span className="aip-theme-preview-title">AI</span>
              </div>
              <div className="aip-theme-preview-chips">
                {t.colors.map((c, i) => (
                  <span key={i} className="aip-theme-preview-chip" style={{ borderColor: `${c}55`, color: `${c}cc` }}>
                    ◈
                  </span>
                ))}
              </div>
              <div className="aip-theme-preview-line" style={{ background: t.colors[0] }} />
              <div className="aip-theme-preview-line aip-theme-preview-line-short" style={{ background: `${t.colors[0]}44` }} />
              <div className="aip-theme-preview-input">
                <span className="aip-theme-preview-placeholder">Спросите…</span>
                <span className="aip-theme-preview-send" style={{ background: `${t.colors[0]}22`, color: t.colors[0] }}>→</span>
              </div>
            </div>
            <div className="aip-theme-card-body">
              <span className="aip-theme-card-label">{t.label}</span>
              <span className="aip-theme-card-desc">{t.description}</span>
            </div>
            {theme === t.id && (
              <span className="aip-theme-card-check" style={{ background: t.colors[0] }}>✓</span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
