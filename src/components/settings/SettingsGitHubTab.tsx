"use client";

import { FormEvent, useMemo, useState } from "react";

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

function formatMoney(value: number): string {
  if (!Number.isFinite(value)) return "0";
  return value.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

export default function SettingsGitHubTab() {
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
        headers: { "content-type": "application/json" },
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
      { key: "copilot", title: "GitHub Copilot premium requests", value: billing?.copilotPremium ?? null },
      { key: "actions", title: "GitHub Actions billing", value: billing?.actions ?? null },
      { key: "codespaces", title: "GitHub Codespaces billing", value: billing?.codespaces ?? null },
    ],
    [billing],
  );

  return (
    <div className="settings-tab-content">
      <form className="settings-grid" onSubmit={onLoadBilling}>
        <label className="settings-field">
          <span>Organization</span>
          <input
            className="settings-tab-input"
            value={org}
            onChange={(event) => setOrg(event.target.value)}
            placeholder="your-org"
            autoComplete="off"
          />
        </label>

        <label className="settings-field">
          <span>Personal access token</span>
          <input
            className="settings-tab-input"
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
              className="settings-tab-input"
              value={year}
              onChange={(event) => setYear(event.target.value)}
              placeholder="2026"
              inputMode="numeric"
            />
          </label>

          <label className="settings-field">
            <span>Месяц (1-12)</span>
            <input
              className="settings-tab-input"
              value={month}
              onChange={(event) => setMonth(event.target.value)}
              placeholder="2"
              inputMode="numeric"
            />
          </label>
        </div>

        <button type="submit" className="settings-tab-btn">
          {isLoading ? "Загрузка..." : "Загрузить лимиты"}
        </button>
      </form>

      {error ? <p className="settings-tab-error">{error}</p> : null}

      <div className="settings-tab-cards-grid">
        {cards.map((card) => (
          <div key={card.key} className="settings-tab-card">
            <p className="settings-tab-card-title">{card.title}</p>
            {card.value ? (
              <>
                <p className="settings-tab-card-body">
                  {card.value.quantity.toLocaleString("en-US")}
                  {card.value.unit ? ` ${card.value.unit}` : ""}
                </p>
                <p className="settings-tab-card-meta">Net amount: ${formatMoney(card.value.netAmount)}</p>
                <p className="settings-tab-card-meta">Rows: {card.value.rows}</p>
              </>
            ) : (
              <p className="settings-tab-card-body">Нет данных</p>
            )}
          </div>
        ))}
      </div>

      <p className="settings-tab-muted">
        PAT в localStorage: {hasToken ? "сохранён" : "не сохранён"}.
        {lastSync ? ` Последняя синхронизация: ${lastSync}.` : ""}
      </p>
    </div>
  );
}
