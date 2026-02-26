"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import TlsAcmeSettings from "@/components/settings/TlsAcmeSettings";

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

const GITHUB_ORG_KEY = "netden:github:org";
const GITHUB_TOKEN_KEY = "netden:github:token";
const GITHUB_LAST_SYNC_KEY = "netden:github:last-sync";

interface GitHubBillingMetric {
  quantity: number;
  unit: string | null;
  netAmount: number;
  rows: number;
}

interface GitHubBillingResponse {
  copilotPremium: GitHubBillingMetric;
  actions: GitHubBillingMetric;
  codespaces: GitHubBillingMetric;
  raw: {
    hasUsage: boolean;
    hasSummary: boolean;
  };
}

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

function formatMoney(value: number): string {
  if (!Number.isFinite(value)) return "0";
  return value.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

export default function SettingsPage() {
  const [isEmbedded, setIsEmbedded] = useState(false);
  const [scale, setScale] = useState(() => {
    if (typeof window === "undefined") {
      return DEFAULT_SCALE;
    }

    const raw = window.localStorage.getItem(CLI_SCALE_KEY);
    if (!raw) {
      return DEFAULT_SCALE;
    }

    return clampScale(Number(raw));
  });

  const [stroke, setStroke] = useState(() => {
    if (typeof window === "undefined") {
      return DEFAULT_STROKE;
    }

    const raw = window.localStorage.getItem(CLI_STROKE_KEY);
    if (!raw) {
      return DEFAULT_STROKE;
    }

    return clampStroke(Number(raw));
  });

  const [org, setOrg] = useState(() => {
    if (typeof window === "undefined") return "";
    return window.localStorage.getItem(GITHUB_ORG_KEY) ?? "";
  });

  const [token, setToken] = useState(() => {
    if (typeof window === "undefined") return "";
    return window.localStorage.getItem(GITHUB_TOKEN_KEY) ?? "";
  });

  const [year, setYear] = useState("");
  const [month, setMonth] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [billing, setBilling] = useState<GitHubBillingResponse | null>(null);
  const [lastSync, setLastSync] = useState(() => {
    if (typeof window === "undefined") return "";
    return window.localStorage.getItem(GITHUB_LAST_SYNC_KEY) ?? "";
  });

  const hasToken = token.trim().length > 0;

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setIsEmbedded(params.get("embedded") === "1");
  }, []);

  const saveScale = (nextScale: number) => {
    const clamped = clampScale(nextScale);
    setScale(clamped);
    window.localStorage.setItem(CLI_SCALE_KEY, String(clamped));
    if (window.parent && window.parent !== window) {
      window.parent.postMessage(
        {
          type: CLI_SETTINGS_MESSAGE,
          scale: clamped,
        },
        window.location.origin,
      );
    }
  };

  const resetScale = () => {
    setScale(DEFAULT_SCALE);
    window.localStorage.setItem(CLI_SCALE_KEY, String(DEFAULT_SCALE));
    if (window.parent && window.parent !== window) {
      window.parent.postMessage(
        {
          type: CLI_SETTINGS_MESSAGE,
          scale: DEFAULT_SCALE,
        },
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

  const onLoadBilling = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isLoading) return;

    setError(null);
    setIsLoading(true);

    try {
      const normalizedOrg = org.trim();
      const normalizedToken = token.trim();
      if (!normalizedOrg || !normalizedToken) {
        throw new Error("Укажите org и PAT для загрузки лимитов.");
      }

      const yearValue = year.trim() ? Number(year.trim()) : undefined;
      const monthValue = month.trim() ? Number(month.trim()) : undefined;

      const response = await fetch("/api/github/billing", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          org: normalizedOrg,
          token: normalizedToken,
          period: {
            year: Number.isFinite(yearValue) ? yearValue : undefined,
            month: Number.isFinite(monthValue) ? monthValue : undefined,
          },
        }),
      });

      const payload = (await response.json().catch(() => null)) as
        | { message?: string }
        | GitHubBillingResponse
        | null;

      if (!response.ok) {
        const message =
          payload && "message" in payload && typeof payload.message === "string"
            ? payload.message
            : `Ошибка GitHub API (${response.status})`;
        throw new Error(message);
      }

      const data = payload as GitHubBillingResponse;
      setBilling(data);

      const syncStamp = new Intl.DateTimeFormat("ru-RU", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date());
      setLastSync(syncStamp);

      window.localStorage.setItem(GITHUB_ORG_KEY, normalizedOrg);
      window.localStorage.setItem(GITHUB_TOKEN_KEY, normalizedToken);
      window.localStorage.setItem(GITHUB_LAST_SYNC_KEY, syncStamp);
    } catch (loadError) {
      const message = loadError instanceof Error ? loadError.message : "Не удалось получить billing";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const cards = useMemo(
    () => [
      {
        key: "copilot",
        title: "GitHub Copilot premium requests",
        value: billing?.copilotPremium ?? null,
      },
      {
        key: "actions",
        title: "GitHub Actions billing",
        value: billing?.actions ?? null,
      },
      {
        key: "codespaces",
        title: "GitHub Codespaces billing",
        value: billing?.codespaces ?? null,
      },
    ],
    [billing],
  );

  return (
    <div className={`home-page-shell ${isEmbedded ? "home-page-shell-embedded" : ""}`}>
      <div className={`home-page-grid ${isEmbedded ? "home-page-grid-embedded" : ""}`}>
        <header className="home-header">
          <div>
            <p className="home-kicker">NetDen</p>
            <h1 className="home-title">Настройки</h1>
            <p className="home-subtitle">CLI масштаб/толщина, GitHub Billing и управление HTTPS сертификатом.</p>
          </div>
          {!isEmbedded ? (
            <nav className="home-links">
              <Link href="/" className="home-link">
                Консоль
              </Link>
              <Link href="/home" className="home-link">
                Главная
              </Link>
              <Link href="/notes" className="home-link">
                Заметки
              </Link>
            </nav>
          ) : null}
        </header>

        <section className="home-card">
          <h2 className="home-card-title">Параметры CLI</h2>

          <div className="settings-range-block">
            <div className="home-card-head">
              <span className="home-muted">Размер окна ввода CLI</span>
              <strong className="home-metric-value">{formatPercent(scale)}</strong>
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

            <button type="button" onClick={resetScale} className="notes-submit settings-reset">
              Сбросить размер
            </button>
          </div>

          <div className="settings-range-divider" aria-hidden />

          <div className="settings-range-block">
            <div className="home-card-head">
              <span className="home-muted">Толщина командной строки</span>
              <strong className="home-metric-value">{formatStroke(stroke)}</strong>
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

            <button type="button" onClick={resetStroke} className="notes-submit settings-reset">
              Сбросить толщину
            </button>
          </div>
        </section>

        <section className="home-card">
          <h2 className="home-card-title">GitHub интеграция</h2>
          <form className="settings-grid" onSubmit={onLoadBilling}>
            <label className="settings-field">
              <span>Organization</span>
              <input
                className="notes-input"
                value={org}
                onChange={(event) => setOrg(event.target.value)}
                placeholder="your-org"
                autoComplete="off"
              />
            </label>

            <label className="settings-field">
              <span>Personal access token</span>
              <input
                className="notes-input"
                type="password"
                value={token}
                onChange={(event) => setToken(event.target.value)}
                placeholder="github_pat_***"
                autoComplete="off"
              />
            </label>

            <div className="settings-inline">
              <label className="settings-field">
                <span>Год (опционально)</span>
                <input
                  className="notes-input"
                  value={year}
                  onChange={(event) => setYear(event.target.value)}
                  placeholder="2026"
                  inputMode="numeric"
                />
              </label>

              <label className="settings-field">
                <span>Месяц (1-12)</span>
                <input
                  className="notes-input"
                  value={month}
                  onChange={(event) => setMonth(event.target.value)}
                  placeholder="2"
                  inputMode="numeric"
                />
              </label>
            </div>

            <button type="submit" className="notes-submit">
              {isLoading ? "Загрузка..." : "Загрузить лимиты"}
            </button>
          </form>

          {error ? <p className="notes-error">{error}</p> : null}

          <div className="home-settings-grid">
            {cards.map((card) => (
              <div key={card.key} className="home-inline-card">
                <p className="home-inline-title">{card.title}</p>
                {card.value ? (
                  <>
                    <p className="home-inline-body">
                      {card.value.quantity.toLocaleString("en-US")}
                      {card.value.unit ? ` ${card.value.unit}` : ""}
                    </p>
                    <p className="home-inline-meta">Net amount: ${formatMoney(card.value.netAmount)}</p>
                    <p className="home-inline-meta">Rows: {card.value.rows}</p>
                  </>
                ) : (
                  <p className="home-inline-body">Нет данных</p>
                )}
              </div>
            ))}
          </div>

          <p className="home-muted">
            PAT в localStorage: {hasToken ? "сохранён" : "не сохранён"}.
            {lastSync ? ` Последняя синхронизация: ${lastSync}.` : ""}
          </p>
        </section>

        <TlsAcmeSettings />
      </div>
    </div>
  );
}
