"use client";

import { useState } from "react";

const CLI_SCALE_KEY = "netden:cli-scale";
const CLI_SETTINGS_MESSAGE = "netden:cli-settings-updated";
const MIN = 0.8;
const MAX = 1.2;
const STEP = 0.01;
const DEFAULT_SCALE = 1;
const CLI_STROKE_KEY = "netden:cli-stroke";
const STROKE_MIN = 0.5;
const STROKE_MAX = 2;
const STROKE_STEP = 0.05;
const DEFAULT_STROKE = 1;

function clampScale(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_SCALE;
  return Math.min(MAX, Math.max(MIN, value));
}

function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

function clampStroke(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_STROKE;
  return Math.min(STROKE_MAX, Math.max(STROKE_MIN, value));
}

function formatStroke(value: number): string {
  return `${value.toFixed(2)}x`;
}

export default function SettingsCliTab() {
  const [scale, setScale] = useState(() => {
    if (typeof window === "undefined") return DEFAULT_SCALE;
    const raw = window.localStorage.getItem(CLI_SCALE_KEY);
    if (!raw) return DEFAULT_SCALE;
    return clampScale(Number(raw));
  });

  const [stroke, setStroke] = useState(() => {
    if (typeof window === "undefined") return DEFAULT_STROKE;
    const raw = window.localStorage.getItem(CLI_STROKE_KEY);
    if (!raw) return DEFAULT_STROKE;
    return clampStroke(Number(raw));
  });

  const saveScale = (nextScale: number) => {
    const clamped = clampScale(nextScale);
    setScale(clamped);
    window.localStorage.setItem(CLI_SCALE_KEY, String(clamped));
    if (window.parent && window.parent !== window) {
      window.parent.postMessage(
        { type: CLI_SETTINGS_MESSAGE, scale: clamped },
        window.location.origin,
      );
    }
  };

  const resetScale = () => {
    setScale(DEFAULT_SCALE);
    window.localStorage.setItem(CLI_SCALE_KEY, String(DEFAULT_SCALE));
    if (window.parent && window.parent !== window) {
      window.parent.postMessage(
        { type: CLI_SETTINGS_MESSAGE, scale: DEFAULT_SCALE },
        window.location.origin,
      );
    }
  };

  const saveStroke = (nextStroke: number) => {
    const clamped = clampStroke(nextStroke);
    setStroke(clamped);
    window.localStorage.setItem(CLI_STROKE_KEY, String(clamped));
  };

  const resetStroke = () => {
    setStroke(DEFAULT_STROKE);
    window.localStorage.setItem(CLI_STROKE_KEY, String(DEFAULT_STROKE));
  };

  return (
    <div className="settings-tab-content">
      <div className="settings-range-block">
        <div className="settings-tab-row">
          <span className="settings-tab-label">Размер окна ввода CLI</span>
          <strong className="settings-tab-value">{formatPercent(scale)}</strong>
        </div>

        <input
          type="range"
          min={MIN}
          max={MAX}
          step={STEP}
          value={scale}
          onChange={(event) => saveScale(Number(event.target.value))}
          className="settings-range"
        />

        <div className="settings-range-meta">
          <span>{formatPercent(MIN)}</span>
          <span>{formatPercent(DEFAULT_SCALE)}</span>
          <span>{formatPercent(MAX)}</span>
        </div>

        <button type="button" onClick={resetScale} className="settings-tab-btn-secondary">
          Сбросить размер
        </button>
      </div>

      <div className="settings-range-divider" aria-hidden />

      <div className="settings-range-block">
        <div className="settings-tab-row">
          <span className="settings-tab-label">Толщина командной строки</span>
          <strong className="settings-tab-value">{formatStroke(stroke)}</strong>
        </div>

        <input
          type="range"
          min={STROKE_MIN}
          max={STROKE_MAX}
          step={STROKE_STEP}
          value={stroke}
          onChange={(event) => saveStroke(Number(event.target.value))}
          className="settings-range"
        />

        <div className="settings-range-meta">
          <span>{formatStroke(STROKE_MIN)}</span>
          <span>{formatStroke(DEFAULT_STROKE)}</span>
          <span>{formatStroke(STROKE_MAX)}</span>
        </div>

        <button type="button" onClick={resetStroke} className="settings-tab-btn-secondary">
          Сбросить толщину
        </button>
      </div>
    </div>
  );
}
