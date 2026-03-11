import type { CSSProperties } from "react";

type Calendar2CssVariables = CSSProperties & Record<`--cal2-${string}`, string>;

/**
 * Calendar 2 Linear Tokens
 *
 * Цвета:
 * - Фон приложения: #0F0F0F
 * - Поверхность 1: #1A1A1A
 * - Поверхность 2: #1E1E1E
 * - Граница: rgba(255,255,255,0.08)
 * - Текст primary: #F0F0F0
 * - Текст secondary: #6B6B6B
 * - Текст disabled: #3A3A3A
 * - Акцент: #5E6AD2
 *
 * Типографика и плотность:
 * - Базовый размер: 13px (text-[13px])
 * - Малый размер: 11px (text-[11px])
 * - Компактная высота строки: leading-[1.2] / leading-[1.3]
 * - Базовый ритм отступов: 4px, 6px, 8px, 10px, 12px
 */
export const CALENDAR2_LINEAR_VARS: Calendar2CssVariables = {
  "--cal2-bg": "#0F0F0F",
  "--cal2-surface-1": "#1A1A1A",
  "--cal2-surface-2": "#1E1E1E",
  "--cal2-surface-3": "#242424",
  "--cal2-border": "rgba(255,255,255,0.08)",
  "--cal2-border-subtle": "rgba(255,255,255,0.05)",
  "--cal2-text-primary": "#F0F0F0",
  "--cal2-text-secondary": "#6B6B6B",
  "--cal2-text-disabled": "#3A3A3A",
  "--cal2-accent": "#5E6AD2",
  "--cal2-accent-hover": "#6C78E0",
  "--cal2-accent-soft": "rgba(94,106,210,0.18)",
  "--cal2-accent-soft-strong": "rgba(94,106,210,0.28)",
  "--cal2-inbox-soft": "rgba(94,106,210,0.1)",
  "--cal2-overlay": "rgba(15,15,15,0.78)",
  "--cal2-success": "#4ADE80",
  "--cal2-success-soft": "rgba(74,222,128,0.12)",
  "--cal2-warning": "#FBBF24",
  "--cal2-warning-soft": "rgba(251,191,36,0.12)",
  "--cal2-danger": "#F87171",
  "--cal2-danger-soft": "rgba(248,113,113,0.12)",
  "--cal2-month-card": "linear-gradient(180deg, rgba(33,33,33,0.98) 0%, rgba(24,24,24,0.98) 100%)",
  "--cal2-month-card-muted": "linear-gradient(180deg, rgba(22,22,22,0.9) 0%, rgba(16,16,16,0.94) 100%)",
  "--cal2-month-card-hover": "linear-gradient(180deg, rgba(40,40,40,0.98) 0%, rgba(28,28,28,0.98) 100%)",
  "--cal2-month-card-active": "linear-gradient(180deg, rgba(36,38,58,0.98) 0%, rgba(24,26,40,0.98) 100%)",
  "--cal2-month-shadow": "0 18px 38px -30px rgba(0,0,0,0.95), inset 0 1px 0 rgba(255,255,255,0.06)",
  "--cal2-month-shadow-active": "0 24px 46px -28px rgba(50,64,160,0.42), inset 0 1px 0 rgba(255,255,255,0.1)",
  "--cal2-glow-line": "rgba(126,141,255,0.38)",
  "--cal2-glow-line-strong": "rgba(148,163,255,0.78)",
  "--cal2-glow-ambient": "rgba(94,106,210,0.2)",
  "--cal2-glow-ambient-strong": "rgba(94,106,210,0.34)",
};
