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

interface OpenRouterModelOption {
  id: string;
  label: string;
}

type OpenRouterStatus = "unknown" | "valid" | "invalid";

interface OpenRouterConfigView {
  hasKey: boolean;
  keyMask: string | null;
  status: OpenRouterStatus;
  model: string;
  lastValidatedAt: string | null;
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
  const [openRouterKey, setOpenRouterKey] = useState("");
  const [openRouterConfig, setOpenRouterConfig] = useState<OpenRouterConfigView>({
    hasKey: false,
    keyMask: null,
    status: "unknown",
    model: "openai/gpt-4o-mini",
    lastValidatedAt: null,
  });
  const [openRouterModels, setOpenRouterModels] = useState<OpenRouterModelOption[]>([]);
  const [openRouterBusy, setOpenRouterBusy] = useState(false);
  const [openRouterError, setOpenRouterError] = useState<string | null>(null);
  const [openRouterNotice, setOpenRouterNotice] = useState<string | null>(null);

  const hasToken = token.trim().length > 0;

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setIsEmbedded(params.get("embedded") === "1");
  }, []);

  useEffect(() => {
    const loadOpenRouterSettings = async () => {
      setOpenRouterBusy(true);
      setOpenRouterError(null);
      setOpenRouterNotice(null);
      try {
        const response = await fetch("/api/agent/openrouter", {
          method: "GET",
          headers: {
            "content-type": "application/json",
          },
        });

        const payload = (await response.json().catch(() => null)) as
          | {
              ok?: boolean;
              message?: string;
              config?: OpenRouterConfigView;
              models?: OpenRouterModelOption[];
            }
          | null;

        if (!response.ok || !payload?.ok || !payload.config) {
          const message = payload?.message || `OpenRouter settings error (${response.status})`;
          throw new Error(message);
        }

        setOpenRouterConfig(payload.config);
        setOpenRouterModels(Array.isArray(payload.models) ? payload.models : []);
      } catch (loadError) {
        const message = loadError instanceof Error ? loadError.message : "Не удалось загрузить OpenRouter настройки";
        setOpenRouterError(message);
      } finally {
        setOpenRouterBusy(false);
      }
    };

    void loadOpenRouterSettings();
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

  const openRouterStatusLabel = useMemo(() => {
    if (openRouterConfig.status === "valid") {
      return "Ключ валидный";
    }
    if (openRouterConfig.status === "invalid") {
      return "Ключ невалидный";
    }
    return "Ключ не проверен";
  }, [openRouterConfig.status]);

  const openRouterLampClass = useMemo(() => {
    if (openRouterConfig.status === "valid") {
      return "agent-status-lamp agent-status-lamp-valid";
    }
    if (openRouterConfig.status === "invalid") {
      return "agent-status-lamp agent-status-lamp-invalid";
    }
    return "agent-status-lamp";
  }, [openRouterConfig.status]);

  const saveOpenRouterKey = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (openRouterBusy) return;

    const normalized = openRouterKey.trim();
    if (!normalized) {
      setOpenRouterError("Введите OpenRouter API key.");
      return;
    }

    setOpenRouterBusy(true);
    setOpenRouterError(null);
    setOpenRouterNotice(null);

    try {
      const response = await fetch("/api/agent/openrouter", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          action: "save_key",
          apiKey: normalized,
        }),
      });

      const payload = (await response.json().catch(() => null)) as
        | {
            ok?: boolean;
            message?: string;
            config?: OpenRouterConfigView;
            models?: OpenRouterModelOption[];
            validation?: { valid?: boolean };
          }
        | null;

      if (!response.ok || !payload?.ok || !payload.config) {
        const message = payload?.message || `OpenRouter save error (${response.status})`;
        throw new Error(message);
      }

      setOpenRouterConfig(payload.config);
      setOpenRouterModels(Array.isArray(payload.models) ? payload.models : []);
      setOpenRouterKey("");
      setOpenRouterNotice(
        payload.validation?.valid
          ? "Ключ сохранён и успешно проверен."
          : "Ключ сохранён, но проверка не пройдена.",
      );
    } catch (saveError) {
      const message = saveError instanceof Error ? saveError.message : "Не удалось сохранить ключ";
      setOpenRouterError(message);
    } finally {
      setOpenRouterBusy(false);
    }
  };

  const clearOpenRouterKey = async () => {
    if (openRouterBusy) return;

    setOpenRouterBusy(true);
    setOpenRouterError(null);
    setOpenRouterNotice(null);
    try {
      const response = await fetch("/api/agent/openrouter", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          action: "clear_key",
        }),
      });

      const payload = (await response.json().catch(() => null)) as
        | { ok?: boolean; message?: string; config?: OpenRouterConfigView }
        | null;

      if (!response.ok || !payload?.ok || !payload.config) {
        const message = payload?.message || `OpenRouter clear error (${response.status})`;
        throw new Error(message);
      }

      setOpenRouterConfig(payload.config);
      setOpenRouterModels([]);
      setOpenRouterNotice("Ключ удалён.");
    } catch (clearError) {
      const message = clearError instanceof Error ? clearError.message : "Не удалось удалить ключ";
      setOpenRouterError(message);
    } finally {
      setOpenRouterBusy(false);
    }
  };

  const refreshOpenRouterModels = async () => {
    if (openRouterBusy) return;
    setOpenRouterBusy(true);
    setOpenRouterError(null);
    setOpenRouterNotice(null);

    try {
      const response = await fetch("/api/agent/openrouter", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          action: "refresh_models",
        }),
      });

      const payload = (await response.json().catch(() => null)) as
        | { ok?: boolean; message?: string; models?: OpenRouterModelOption[] }
        | null;

      if (!response.ok || !payload?.ok) {
        const message = payload?.message || `OpenRouter models error (${response.status})`;
        throw new Error(message);
      }

      setOpenRouterModels(Array.isArray(payload.models) ? payload.models : []);
      setOpenRouterNotice("Список моделей обновлён.");
    } catch (refreshError) {
      const message = refreshError instanceof Error ? refreshError.message : "Не удалось обновить модели";
      setOpenRouterError(message);
    } finally {
      setOpenRouterBusy(false);
    }
  };

  const updateOpenRouterModel = async (nextModel: string) => {
    if (openRouterBusy) return;
    setOpenRouterBusy(true);
    setOpenRouterError(null);
    setOpenRouterNotice(null);
    try {
      const response = await fetch("/api/agent/openrouter", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          action: "set_model",
          model: nextModel,
        }),
      });

      const payload = (await response.json().catch(() => null)) as
        | { ok?: boolean; message?: string; config?: OpenRouterConfigView }
        | null;

      if (!response.ok || !payload?.ok || !payload.config) {
        const message = payload?.message || `OpenRouter model error (${response.status})`;
        throw new Error(message);
      }

      setOpenRouterConfig(payload.config);
      setOpenRouterNotice(`Модель сохранена: ${payload.config.model}`);
    } catch (modelError) {
      const message = modelError instanceof Error ? modelError.message : "Не удалось сохранить модель";
      setOpenRouterError(message);
    } finally {
      setOpenRouterBusy(false);
    }
  };

  return (
    <div className={`home-page-shell ${isEmbedded ? "home-page-shell-embedded" : ""}`}>
      <div className={`home-page-grid ${isEmbedded ? "home-page-grid-embedded" : ""}`}>
        <header className="home-header">
          <div className="home-header-left">
            {!isEmbedded ? (
              <Link href="/calendar" className="home-back-link">
                ← Календарь
              </Link>
            ) : null}
            <div>
              <p className="home-kicker">NetDen</p>
              <h1 className="home-title">Настройки</h1>
              <p className="home-subtitle">CLI, GitHub Billing, OpenRouter AI и управление HTTPS сертификатом.</p>
            </div>
          </div>
          {!isEmbedded ? (
            <nav className="home-links">
              <Link href="/calendar" className="home-link">
                Календарь
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

        <section className="home-card">
          <h2 className="home-card-title">OpenRouter для AI-агента</h2>
          <form className="settings-grid" onSubmit={saveOpenRouterKey}>
            <label className="settings-field">
              <span>OpenRouter API key</span>
              <input
                className="notes-input"
                type="password"
                value={openRouterKey}
                onChange={(event) => setOpenRouterKey(event.target.value)}
                placeholder="sk-or-***"
                autoComplete="off"
              />
            </label>

            <div className="settings-inline">
              <button type="submit" className="notes-submit" disabled={openRouterBusy}>
                {openRouterBusy ? "Проверка..." : "Сохранить и проверить ключ"}
              </button>

              <button
                type="button"
                className="notes-submit settings-reset"
                onClick={clearOpenRouterKey}
                disabled={openRouterBusy || !openRouterConfig.hasKey}
              >
                Удалить ключ
              </button>
            </div>
          </form>

          <div className="home-inline-card" style={{ marginTop: 12 }}>
            <p className="home-inline-title">Статус ключа</p>
            <p className="home-inline-body">
              <span className={openRouterLampClass} aria-hidden /> {openRouterStatusLabel}
            </p>
            <p className="home-inline-meta">
              {openRouterConfig.keyMask ? `Подключён: ${openRouterConfig.keyMask}` : "Ключ не подключён"}
            </p>
          </div>

          <div className="settings-grid" style={{ marginTop: 12 }}>
            <label className="settings-field">
              <span>Модель по умолчанию</span>
              <select
                className="notes-input"
                value={openRouterConfig.model}
                onChange={(event) => void updateOpenRouterModel(event.target.value)}
                disabled={openRouterBusy || openRouterModels.length === 0}
              >
                <option value={openRouterConfig.model}>{openRouterConfig.model}</option>
                {openRouterModels
                  .filter((item) => item.id !== openRouterConfig.model)
                  .map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.label}
                    </option>
                  ))}
              </select>
            </label>

            <button
              type="button"
              className="notes-submit"
              onClick={refreshOpenRouterModels}
              disabled={openRouterBusy || !openRouterConfig.hasKey}
            >
              Обновить список моделей
            </button>
          </div>

          {openRouterError ? <p className="notes-error">{openRouterError}</p> : null}
          {openRouterNotice ? <p className="home-muted">{openRouterNotice}</p> : null}
          <p className="home-muted">Ключ хранится на сервере в зашифрованном виде и не пишется в `.env`.</p>
        </section>

        <TlsAcmeSettings />
      </div>
    </div>
  );
}
