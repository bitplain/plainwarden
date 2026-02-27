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
  "--cal2-border": "rgba(255,255,255,0.08)",
  "--cal2-text-primary": "#F0F0F0",
  "--cal2-text-secondary": "#6B6B6B",
  "--cal2-text-disabled": "#3A3A3A",
  "--cal2-accent": "#5E6AD2",
  "--cal2-accent-soft": "rgba(94,106,210,0.18)",
  "--cal2-accent-soft-strong": "rgba(94,106,210,0.28)",
  "--cal2-overlay": "rgba(15,15,15,0.78)",
};
