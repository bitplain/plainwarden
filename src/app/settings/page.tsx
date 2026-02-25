"use client";

import Link from "next/link";
import { useState } from "react";

const KEY = "netden:cli-scale";
const MIN = 0.8;
const MAX = 1.2;
const STEP = 0.01;
const DEFAULT_SCALE = 1;

function clampScale(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_SCALE;
  return Math.min(MAX, Math.max(MIN, value));
}

function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

export default function SettingsPage() {
  const [scale, setScale] = useState(() => {
    if (typeof window === "undefined") {
      return DEFAULT_SCALE;
    }

    const raw = window.localStorage.getItem(KEY);
    if (!raw) {
      return DEFAULT_SCALE;
    }

    return clampScale(Number(raw));
  });

  const saveScale = (nextScale: number) => {
    const clamped = clampScale(nextScale);
    setScale(clamped);
    window.localStorage.setItem(KEY, String(clamped));
  };

  const resetScale = () => {
    setScale(DEFAULT_SCALE);
    window.localStorage.setItem(KEY, String(DEFAULT_SCALE));
  };

  return (
    <div className="min-h-dvh bg-black px-5 py-10 text-zinc-100 font-sans">
      <div className="mx-auto w-full max-w-lg">
        <div className="mb-6">
          <div className="text-xs font-medium tracking-wide text-zinc-500">NetDen</div>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight">Настройки</h1>
          <p className="mt-2 text-sm text-zinc-400">
            Измените размер окна ввода CLI на главной странице.
          </p>
        </div>

        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
          <div className="flex items-center justify-between text-sm text-zinc-300">
            <span>Размер окна ввода CLI</span>
            <strong className="text-zinc-100">{formatPercent(scale)}</strong>
          </div>

          <input
            type="range"
            min={MIN}
            max={MAX}
            step={STEP}
            value={scale}
            onChange={(event) => saveScale(Number(event.target.value))}
            className="mt-5 w-full accent-[var(--terminal-slash)]"
          />

          <div className="mt-3 flex items-center justify-between text-xs text-zinc-500">
            <span>{formatPercent(MIN)}</span>
            <span>{formatPercent(DEFAULT_SCALE)}</span>
            <span>{formatPercent(MAX)}</span>
          </div>

          <button
            type="button"
            onClick={resetScale}
            className="mt-5 h-10 rounded-lg border border-white/10 bg-transparent px-4 text-sm text-zinc-200 transition hover:bg-white/5"
          >
            Сбросить размер
          </button>
        </div>

        <div className="mt-4 text-sm">
          <Link href="/" className="text-zinc-300 transition hover:text-white">
            ← Назад в терминал
          </Link>
        </div>
      </div>
    </div>
  );
}
