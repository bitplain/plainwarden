"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type LogEntry = {
  at: string;
  stage: string;
  level: "info" | "error";
  message: string;
};

type AcmeStatusPayload = {
  ok: true;
  configured: boolean;
  domain: string;
  email: string;
  status: "idle" | "issuing" | "active" | "failed";
  stage: "idle" | "precheck" | "apply_caddy_config" | "wait_tls_probe" | "active" | "failed";
  expiresAt: string | null;
  lastError: string | null;
  updatedAt: string;
  lastProbeAt: string | null;
  renewalState: "unknown" | "healthy" | "renewal_due" | "expired";
  daysUntilExpiry: number | null;
  renewBeforeDays: number;
  renewalMessage: string;
  probeDue: boolean;
  logs: LogEntry[];
};

const STATUS_VIEW: Record<AcmeStatusPayload["status"], { label: string; cls: string }> = {
  idle: { label: "Не запущено", cls: "acme-badge acme-badge-idle" },
  issuing: { label: "Выпуск", cls: "acme-badge acme-badge-issuing" },
  active: { label: "Активно", cls: "acme-badge acme-badge-active" },
  failed: { label: "Ошибка", cls: "acme-badge acme-badge-failed" },
};

const STAGE_LABEL: Record<AcmeStatusPayload["stage"], string> = {
  idle: "Ожидание",
  precheck: "Проверка",
  apply_caddy_config: "Применение в Caddy",
  wait_tls_probe: "Ожидание TLS",
  active: "Активно",
  failed: "Ошибка",
};

const RENEWAL_VIEW: Record<AcmeStatusPayload["renewalState"], { label: string; cls: string }> = {
  unknown: { label: "Неизвестно", cls: "acme-badge acme-badge-idle" },
  healthy: { label: "Ок", cls: "acme-badge acme-badge-active" },
  renewal_due: { label: "Скоро renewal", cls: "acme-badge acme-badge-issuing" },
  expired: { label: "Истек", cls: "acme-badge acme-badge-failed" },
};

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("ru-RU");
}

async function fetchJson<T>(url: string, init?: RequestInit & { timeoutMs?: number }): Promise<T> {
  const timeoutMs = init?.timeoutMs ?? 30_000;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...init,
      signal: controller.signal,
      cache: "no-store",
    });

    const payload = (await response.json().catch(() => null)) as
      | { message?: string }
      | { error?: string }
      | T
      | null;

    if (!response.ok) {
      const message =
        payload && typeof payload === "object" && payload
          ? "message" in payload && typeof payload.message === "string"
            ? payload.message
            : "error" in payload && typeof payload.error === "string"
              ? payload.error
              : `Request failed (${response.status})`
          : `Request failed (${response.status})`;
      throw new Error(message);
    }

    return payload as T;
  } finally {
    clearTimeout(timeoutId);
  }
}

export default function TlsAcmeSettings() {
  const [status, setStatus] = useState<AcmeStatusPayload | null>(null);
  const [domain, setDomain] = useState("");
  const [email, setEmail] = useState("");
  const formDirtyRef = useRef(false);

  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const badge = useMemo(() => {
    if (!status) return { label: "Загрузка…", cls: "acme-badge acme-badge-idle" };
    return STATUS_VIEW[status.status];
  }, [status]);

  const renewalBadge = useMemo(() => {
    if (!status) return { label: "Загрузка…", cls: "acme-badge acme-badge-idle" };
    return RENEWAL_VIEW[status.renewalState];
  }, [status]);

  const refresh = useCallback(async (opts?: { syncForm?: boolean; silent?: boolean }) => {
    const syncForm = opts?.syncForm ?? false;
    const silent = opts?.silent ?? false;

    if (!silent) {
      setLoading(true);
    }

    try {
      const next = await fetchJson<AcmeStatusPayload>("/api/integrations/acme/status");
      setStatus(next);
      if (syncForm || !formDirtyRef.current) {
        setDomain(next.domain || "");
        setEmail(next.email || "");
        if (syncForm) {
          formDirtyRef.current = false;
        }
      }
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    void refresh({ syncForm: true }).catch((e: unknown) => {
      setErr(e instanceof Error ? e.message : "Не удалось загрузить данные ACME.");
    });
  }, [refresh]);

  useEffect(() => {
    const timer = setInterval(() => {
      void refresh({ silent: true }).catch(() => undefined);
    }, 20_000);
    return () => clearInterval(timer);
  }, [refresh]);

  async function saveConfig() {
    setBusy(true);
    setMsg(null);
    setErr(null);
    try {
      await fetchJson<AcmeStatusPayload>("/api/integrations/acme/config", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ domain, email }),
      });

      setMsg("ACME-конфигурация сохранена.");
      await refresh({ syncForm: true });
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Не удалось сохранить ACME-конфигурацию.");
    } finally {
      setBusy(false);
    }
  }

  async function issueCertificate() {
    setBusy(true);
    setMsg(null);
    setErr(null);
    try {
      await fetchJson<AcmeStatusPayload>("/api/integrations/acme/config", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ domain, email }),
      });

      await fetchJson<AcmeStatusPayload>("/api/integrations/acme/issue", {
        method: "POST",
        timeoutMs: 190_000,
      });

      setMsg("Сертификат выпущен и применен в Caddy.");
      await refresh({ syncForm: true });
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Выпуск сертификата завершился ошибкой.");
      await refresh({ syncForm: true }).catch(() => undefined);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="home-card">
      <div className="home-card-head">
        <h2 className="home-card-title">HTTPS / ACME (Let&apos;s Encrypt)</h2>
        <span className={badge.cls}>{badge.label}</span>
      </div>

      <p className="home-muted">
        Один раз выпускает сертификат для домена и дальше автоматически продлевается Caddy.
      </p>

      <div className="settings-grid">
        <label className="settings-field">
          <span>Домен</span>
          <input
            value={domain}
            onChange={(event) => {
              setDomain(event.target.value);
              formDirtyRef.current = true;
            }}
            placeholder="site.example.com"
            disabled={busy || loading}
            className="notes-input"
          />
        </label>

        <label className="settings-field">
          <span>Email для ACME</span>
          <input
            value={email}
            onChange={(event) => {
              setEmail(event.target.value);
              formDirtyRef.current = true;
            }}
            placeholder="admin@example.com"
            disabled={busy || loading}
            className="notes-input"
          />
        </label>

        <div className="acme-actions">
          <button
            type="button"
            onClick={() => void saveConfig()}
            disabled={busy || loading || !domain.trim() || !email.trim()}
            className="notes-submit"
          >
            Сохранить
          </button>
          <button
            type="button"
            onClick={() => void issueCertificate()}
            disabled={busy || loading || !domain.trim() || !email.trim()}
            className="notes-submit"
          >
            {busy ? "Выпуск…" : "Выпустить / обновить сертификат"}
          </button>
          <button
            type="button"
            onClick={() => {
              setMsg(null);
              setErr(null);
              void refresh().catch((e: unknown) =>
                setErr(e instanceof Error ? e.message : "Не удалось обновить статус."),
              );
            }}
            disabled={busy || loading}
            className="notes-submit"
          >
            {loading ? "Обновление…" : "Обновить статус"}
          </button>
        </div>
      </div>

      <div className="acme-meta">
        <div>Стадия: {status ? STAGE_LABEL[status.stage] : "—"}</div>
        <div className="acme-meta-row">
          <span>Монитор renew:</span>
          <span className={renewalBadge.cls}>{renewalBadge.label}</span>
        </div>
        <div>До окончания сертификата: {status?.daysUntilExpiry == null ? "—" : `${status.daysUntilExpiry} дн.`}</div>
        <div>Окно продления: {status ? `${status.renewBeforeDays} дн.` : "—"}</div>
        <div>Срок действия сертификата до: {status ? formatDate(status.expiresAt) : "—"}</div>
        <div>Последняя проверка сертификата: {status ? formatDate(status.lastProbeAt) : "—"}</div>
        <div>Проверка по расписанию: {status?.probeDue ? "требуется" : "не требуется"}</div>
        <div>Обновлено: {status ? formatDate(status.updatedAt) : "—"}</div>
      </div>

      {status ? <div className="acme-note">{status.renewalMessage}</div> : null}

      {status?.logs?.length ? (
        <div className="acme-log">
          <div className="acme-log-title">Журнал выпуска</div>
          <div className="acme-log-list">
            {status.logs
              .slice()
              .reverse()
              .map((entry, idx) => (
                <div
                  key={`${entry.at}-${idx}`}
                  className={entry.level === "error" ? "acme-log-line acme-log-line-error" : "acme-log-line"}
                >
                  [{formatDate(entry.at)}] {entry.message}
                </div>
              ))}
          </div>
        </div>
      ) : null}

      {msg ? <div className="acme-message">{msg}</div> : null}
      {status?.lastError ? <div className="acme-error">{status.lastError}</div> : null}
      {err ? <div className="acme-error">{err}</div> : null}
    </section>
  );
}
