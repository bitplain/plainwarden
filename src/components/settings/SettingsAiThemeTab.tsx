"use client";

import { useEffect, useState } from "react";
import settingsStyles from "@/styles/settings.module.css";
import aipStyles from "@/components/AiChatWidget.module.css";
import {
  readAiTheme,
  saveAiTheme,
  subscribeAiTheme,
  type AiTheme,
} from "@/components/ai-theme";

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
  const [theme, setTheme] = useState<AiTheme>(() => readAiTheme());

  useEffect(() => subscribeAiTheme(setTheme), []);

  const saveTheme = (next: AiTheme) => {
    setTheme(next);
    saveAiTheme(next);
  };

  return (
    <div>
      <h2 className={settingsStyles['settings-tab-section-title']}>Тема AI-виджета</h2>
      <p className={settingsStyles['settings-tab-muted']} style={{ marginBottom: 16 }}>
        Выберите визуальный стиль AI-ассистента
      </p>
      <div className={aipStyles['aip-theme-grid']}>
        {THEMES.map((t) => (
          <button
            key={t.id}
            type="button"
            className={`${aipStyles['aip-theme-card']} ${theme === t.id ? aipStyles['aip-theme-card-active'] : ''}`}
            onClick={() => saveTheme(t.id)}
            data-aip-theme-preview={t.id}
          >
            {/* Preview area */}
            <div className={aipStyles['aip-theme-preview']}>
              <div className={aipStyles['aip-theme-preview-bar']}>
                <span className={aipStyles['aip-theme-preview-dot-sm']} style={{ background: t.colors[0] }} />
                <span className={aipStyles['aip-theme-preview-title']}>AI</span>
              </div>
              <div className={aipStyles['aip-theme-preview-chips']}>
                {t.colors.map((c, i) => (
                  <span key={i} className={aipStyles['aip-theme-preview-chip']} style={{ borderColor: `${c}55`, color: `${c}cc` }}>
                    ◈
                  </span>
                ))}
              </div>
              <div className={aipStyles['aip-theme-preview-line']} style={{ background: t.colors[0] }} />
              <div className={`${aipStyles['aip-theme-preview-line']} ${aipStyles['aip-theme-preview-line-short']}`} style={{ background: `${t.colors[0]}44` }} />
              <div className={aipStyles['aip-theme-preview-input']}>
                <span className={aipStyles['aip-theme-preview-placeholder']}>Спросите…</span>
                <span className={aipStyles['aip-theme-preview-send']} style={{ background: `${t.colors[0]}22`, color: t.colors[0] }}>→</span>
              </div>
            </div>
            <div className={aipStyles['aip-theme-card-body']}>
              <span className={aipStyles['aip-theme-card-label']}>{t.label}</span>
              <span className={aipStyles['aip-theme-card-desc']}>{t.description}</span>
            </div>
            {theme === t.id && (
              <span className={aipStyles['aip-theme-card-check']} style={{ background: t.colors[0] }}>✓</span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
