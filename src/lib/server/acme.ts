import { lookup } from "node:dns/promises";
import tls from "node:tls";
import prisma from "@/lib/server/prisma";

export type AcmeStatus = "idle" | "issuing" | "active" | "failed";
export type AcmeStage =
  | "idle"
  | "precheck"
  | "apply_caddy_config"
  | "wait_tls_probe"
  | "active"
  | "failed";

export type AcmeLogEntry = {
  at: string;
  stage: AcmeStage;
  level: "info" | "error";
  message: string;
};

export type AcmeConfigV1 = {
  version: 1;
  domain: string;
  email: string;
  status: AcmeStatus;
  stage: AcmeStage;
  updatedAt: string;
  lastProbeAt: string | null;
  expiresAt: string | null;
  lastError: string | null;
  logs: AcmeLogEntry[];
};

export type TlsProbeResult = {
  expiresAt: string;
  issuer: string;
};

const INTEGRATION_KEY = "acme";
const MAX_LOGS = 100;
const DEFAULT_WAIT_TLS_MS = 120_000;
const TLS_POLL_MS = 5_000;
const PROBE_REFRESH_INTERVAL_MS = 12 * 60 * 60 * 1000;
const FAILED_PROBE_REFRESH_INTERVAL_MS = 60 * 1000;
const DEFAULT_RENEW_BEFORE_DAYS = 30;

export type AcmeRenewalState = "unknown" | "healthy" | "renewal_due" | "expired";

export type AcmeRenewalMonitor = {
  state: AcmeRenewalState;
  daysUntilExpiry: number | null;
  renewBeforeDays: number;
  message: string;
};

function nowIso(): string {
  return new Date().toISOString();
}

function parseIssuer(issuer: tls.PeerCertificate["issuer"]): string {
  if (!issuer) return "unknown";
  if (typeof issuer === "string") return issuer;
  const parts: string[] = [];
  if (issuer.O) parts.push(String(issuer.O));
  if (issuer.CN) parts.push(String(issuer.CN));
  return parts.join(" ").trim() || "unknown";
}

function appendLog(
  logs: AcmeLogEntry[],
  stage: AcmeStage,
  message: string,
  level: AcmeLogEntry["level"] = "info",
): AcmeLogEntry[] {
  const next = [...logs, { at: nowIso(), stage, level, message }];
  return next.slice(-MAX_LOGS);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isAcmeStatus(value: unknown): value is AcmeStatus {
  return value === "idle" || value === "issuing" || value === "active" || value === "failed";
}

function isAcmeStage(value: unknown): value is AcmeStage {
  return (
    value === "idle" ||
    value === "precheck" ||
    value === "apply_caddy_config" ||
    value === "wait_tls_probe" ||
    value === "active" ||
    value === "failed"
  );
}

function isAcmeLogLevel(value: unknown): value is AcmeLogEntry["level"] {
  return value === "info" || value === "error";
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function normalizeDomain(input: string): string {
  return input.trim().toLowerCase().replace(/\.+$/, "");
}

function isValidDomain(domain: string): boolean {
  if (!domain || domain.length > 253) return false;
  const labels = domain.split(".");
  if (labels.length < 2) return false;
  return labels.every((label) => {
    if (!label || label.length > 63) return false;
    if (label.startsWith("-") || label.endsWith("-")) return false;
    return /^[a-z0-9-]+$/i.test(label);
  });
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function ensureAcmeInput(domainRaw: string, emailRaw: string): { domain: string; email: string } {
  const domain = normalizeDomain(domainRaw);
  const email = normalizeEmail(emailRaw);

  if (!isValidDomain(domain)) {
    throw new Error("Некорректный домен. Укажите FQDN, например site.example.com.");
  }

  if (!isValidEmail(email)) {
    throw new Error("Некорректный email для ACME уведомлений.");
  }

  return { domain, email };
}

export function emptyAcmeConfig(): AcmeConfigV1 {
  return {
    version: 1,
    domain: "",
    email: "",
    status: "idle",
    stage: "idle",
    updatedAt: nowIso(),
    lastProbeAt: null,
    expiresAt: null,
    lastError: null,
    logs: [],
  };
}

function parseAcmeConfig(raw: unknown): AcmeConfigV1 | null {
  if (!isRecord(raw)) {
    return null;
  }

  if (raw.version !== 1) {
    return null;
  }

  if (
    typeof raw.domain !== "string" ||
    typeof raw.email !== "string" ||
    !isAcmeStatus(raw.status) ||
    !isAcmeStage(raw.stage) ||
    typeof raw.updatedAt !== "string"
  ) {
    return null;
  }

  const lastProbeAt =
    raw.lastProbeAt === null || typeof raw.lastProbeAt === "string" ? raw.lastProbeAt : null;
  const expiresAt = raw.expiresAt === null || typeof raw.expiresAt === "string" ? raw.expiresAt : null;
  const lastError =
    raw.lastError === null || typeof raw.lastError === "string" ? raw.lastError : null;

  const logs: AcmeLogEntry[] = Array.isArray(raw.logs)
    ? raw.logs
        .filter(isRecord)
        .map((entry) => {
          if (
            typeof entry.at === "string" &&
            isAcmeStage(entry.stage) &&
            isAcmeLogLevel(entry.level) &&
            typeof entry.message === "string"
          ) {
            return {
              at: entry.at,
              stage: entry.stage,
              level: entry.level,
              message: entry.message,
            } satisfies AcmeLogEntry;
          }
          return null;
        })
        .filter((entry): entry is AcmeLogEntry => entry !== null)
    : [];

  return {
    version: 1,
    domain: raw.domain,
    email: raw.email,
    status: raw.status,
    stage: raw.stage,
    updatedAt: raw.updatedAt,
    lastProbeAt,
    expiresAt,
    lastError,
    logs,
  };
}

export function getAcmeRenewalMonitor(
  expiresAt: string | null,
  renewBeforeDays = DEFAULT_RENEW_BEFORE_DAYS,
  nowMs = Date.now(),
): AcmeRenewalMonitor {
  if (!expiresAt) {
    return {
      state: "unknown",
      daysUntilExpiry: null,
      renewBeforeDays,
      message: "Срок сертификата пока неизвестен.",
    };
  }

  const expiresAtMs = new Date(expiresAt).getTime();
  if (!Number.isFinite(expiresAtMs)) {
    return {
      state: "unknown",
      daysUntilExpiry: null,
      renewBeforeDays,
      message: "Не удалось прочитать дату окончания сертификата.",
    };
  }

  const msPerDay = 24 * 60 * 60 * 1000;
  const daysUntilExpiry = Math.floor((expiresAtMs - nowMs) / msPerDay);
  if (daysUntilExpiry < 0) {
    return {
      state: "expired",
      daysUntilExpiry,
      renewBeforeDays,
      message: "Срок действия сертификата истек.",
    };
  }

  if (daysUntilExpiry <= renewBeforeDays) {
    return {
      state: "renewal_due",
      daysUntilExpiry,
      renewBeforeDays,
      message: `Сертификат входит в окно продления (${renewBeforeDays} дн.).`,
    };
  }

  return {
    state: "healthy",
    daysUntilExpiry,
    renewBeforeDays,
    message: "Сертификат действителен, автопродление под контролем Caddy.",
  };
}

export function isAcmeProbeRefreshDue(
  cfg: Pick<AcmeConfigV1, "domain" | "status" | "lastProbeAt">,
  nowMs = Date.now(),
  intervalMs = PROBE_REFRESH_INTERVAL_MS,
): boolean {
  if (!cfg.domain) return false;

  const intervalForStatus =
    cfg.status === "failed"
      ? FAILED_PROBE_REFRESH_INTERVAL_MS
      : cfg.status === "active"
        ? intervalMs
        : null;

  if (intervalForStatus === null) {
    return false;
  }

  if (!cfg.lastProbeAt) {
    return true;
  }

  const t = new Date(cfg.lastProbeAt).getTime();
  if (!Number.isFinite(t)) {
    return true;
  }

  return nowMs - t >= intervalForStatus;
}

export function buildCaddyAcmeConfig(input: {
  domain: string;
  email: string;
  upstream?: string;
}): Record<string, unknown> {
  const domain = normalizeDomain(input.domain);
  const email = normalizeEmail(input.email);
  const upstream = (input.upstream ?? process.env.CADDY_UPSTREAM ?? "app:3000").trim() || "app:3000";

  return {
    admin: {
      listen: process.env.CADDY_ADMIN_LISTEN || "0.0.0.0:2019",
    },
    apps: {
      http: {
        servers: {
          srv0: {
            listen: [":80", ":443"],
            routes: [
              {
                match: [{ path: ["/healthz"] }],
                handle: [{ handler: "static_response", status_code: 200, body: "ok" }],
                terminal: true,
              },
              {
                match: [{ host: [domain] }],
                handle: [{ handler: "reverse_proxy", upstreams: [{ dial: upstream }] }],
                terminal: true,
              },
              {
                handle: [{ handler: "reverse_proxy", upstreams: [{ dial: upstream }] }],
                terminal: true,
              },
            ],
          },
        },
      },
      tls: {
        automation: {
          policies: [
            {
              subjects: [domain],
              issuers: [{ module: "acme", email }],
            },
          ],
        },
      },
    },
  };
}

export async function readAcmeConfig(): Promise<AcmeConfigV1 | null> {
  const row = await prisma.integrationConfig.findUnique({
    where: { key: INTEGRATION_KEY },
    select: { value: true },
  });

  if (!row) {
    return null;
  }

  return parseAcmeConfig(row.value);
}

async function writeAcmeConfig(cfg: AcmeConfigV1): Promise<void> {
  await prisma.integrationConfig.upsert({
    where: { key: INTEGRATION_KEY },
    update: { value: cfg },
    create: { key: INTEGRATION_KEY, value: cfg },
  });
}

export async function saveAcmeConfig(input: {
  domain: string;
  email: string;
}): Promise<AcmeConfigV1> {
  const { domain, email } = ensureAcmeInput(input.domain, input.email);
  const prev = (await readAcmeConfig()) ?? emptyAcmeConfig();

  const next: AcmeConfigV1 = {
    version: 1,
    domain,
    email,
    status: "idle",
    stage: "idle",
    updatedAt: nowIso(),
    lastProbeAt: prev.domain === domain ? prev.lastProbeAt : null,
    expiresAt: prev.domain === domain ? prev.expiresAt : null,
    lastError: null,
    logs: appendLog(prev.logs, "idle", `Сохранена ACME-конфигурация для ${domain}.`),
  };

  await writeAcmeConfig(next);
  return next;
}

export async function runAcmePrecheck(domainRaw: string, emailRaw: string): Promise<void> {
  const { domain } = ensureAcmeInput(domainRaw, emailRaw);
  const records = await lookup(domain, { all: true });
  if (!records.length) {
    throw new Error("DNS не возвращает A/AAAA запись для домена.");
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function applyCaddyConfig(payload: Record<string, unknown>): Promise<void> {
  const base = (process.env.CADDY_ADMIN_URL || "http://proxy:2019").replace(/\/+$/, "");
  const res = await fetch(`${base}/load`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    const suffix = body ? ` ${body.slice(0, 500)}` : "";
    throw new Error(`Caddy Admin API вернул ${res.status}.${suffix}`);
  }
}

export async function probeTlsCertificate(
  domainRaw: string,
  timeoutMs = 8_000,
): Promise<TlsProbeResult> {
  const domain = normalizeDomain(domainRaw);

  return new Promise<TlsProbeResult>((resolve, reject) => {
    let settled = false;
    const socket = tls.connect({
      host: domain,
      port: 443,
      servername: domain,
      rejectUnauthorized: false,
      timeout: timeoutMs,
    });

    const finish = (err: Error | null, result?: TlsProbeResult) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      if (err) {
        reject(err);
        return;
      }
      resolve(result as TlsProbeResult);
    };

    socket.once("secureConnect", () => {
      const cert = socket.getPeerCertificate();
      if (!cert || Object.keys(cert).length === 0 || !cert.valid_to) {
        finish(new Error("TLS поднят, но сертификат недоступен."));
        return;
      }

      const expiresAtDate = new Date(cert.valid_to);
      if (Number.isNaN(expiresAtDate.getTime())) {
        finish(new Error("Не удалось распарсить дату истечения сертификата."));
        return;
      }

      finish(null, {
        expiresAt: expiresAtDate.toISOString(),
        issuer: parseIssuer(cert.issuer),
      });
    });

    socket.once("timeout", () => finish(new Error("Таймаут TLS проверки.")));
    socket.once("error", (err) => finish(err instanceof Error ? err : new Error(String(err))));
  });
}

export async function waitForTlsActivation(
  domain: string,
  waitMs = DEFAULT_WAIT_TLS_MS,
): Promise<TlsProbeResult> {
  const deadline = Date.now() + waitMs;
  let lastError: string | null = null;

  while (Date.now() < deadline) {
    try {
      return await probeTlsCertificate(domain);
    } catch (err: unknown) {
      lastError = err instanceof Error ? err.message : String(err);
      await sleep(TLS_POLL_MS);
    }
  }

  const tail = lastError ? ` Последняя ошибка: ${lastError}` : "";
  throw new Error(`Сертификат не активировался в течение ${Math.round(waitMs / 1000)} секунд.${tail}`);
}

export async function issueAcmeCertificate(): Promise<AcmeConfigV1> {
  const existing = await readAcmeConfig();
  if (!existing?.domain || !existing?.email) {
    throw new Error("Сначала сохраните домен и email в настройках HTTPS/ACME.");
  }

  const { domain, email } = ensureAcmeInput(existing.domain, existing.email);

  let state: AcmeConfigV1 = {
    ...existing,
    domain,
    email,
    status: "issuing",
    stage: "precheck",
    updatedAt: nowIso(),
    lastError: null,
  };

  const persist = async (patch: Partial<AcmeConfigV1>, log?: Omit<AcmeLogEntry, "at">) => {
    const nextLogs = log ? appendLog(state.logs, log.stage, log.message, log.level) : state.logs;
    state = {
      ...state,
      ...patch,
      logs: nextLogs,
      updatedAt: nowIso(),
    };
    await writeAcmeConfig(state);
  };

  await persist({ stage: "precheck", status: "issuing", lastError: null }, {
    stage: "precheck",
    level: "info",
    message: "Проверка DNS и входных параметров.",
  });

  try {
    await runAcmePrecheck(domain, email);

    const caddyPayload = buildCaddyAcmeConfig({ domain, email });
    await persist({ stage: "apply_caddy_config" }, {
      stage: "apply_caddy_config",
      level: "info",
      message: "Применение конфигурации Caddy через Admin API.",
    });
    await applyCaddyConfig(caddyPayload);

    await persist({ stage: "wait_tls_probe" }, {
      stage: "wait_tls_probe",
      level: "info",
      message: "Ожидание выпуска сертификата и активации HTTPS.",
    });
    const probe = await waitForTlsActivation(domain);

    await persist(
      {
        status: "active",
        stage: "active",
        lastProbeAt: nowIso(),
        expiresAt: probe.expiresAt,
        lastError: null,
      },
      {
        stage: "active",
        level: "info",
        message: `HTTPS активирован. Issuer: ${probe.issuer}.`,
      },
    );

    return state;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    await persist(
      {
        status: "failed",
        stage: "failed",
        lastError: msg,
      },
      {
        stage: "failed",
        level: "error",
        message: msg,
      },
    );
    throw new Error(msg);
  }
}

export async function refreshAcmeCertificateStatus(
  options?: { force?: boolean },
): Promise<AcmeConfigV1 | null> {
  const cfg = await readAcmeConfig();
  if (!cfg) return null;

  const force = options?.force ?? false;
  if (!force && !isAcmeProbeRefreshDue(cfg)) return cfg;

  try {
    const probe = await probeTlsCertificate(cfg.domain);
    const next: AcmeConfigV1 = {
      ...cfg,
      status: "active",
      stage: "active",
      expiresAt: probe.expiresAt,
      lastProbeAt: nowIso(),
      lastError: null,
      updatedAt: nowIso(),
      logs: appendLog(
        cfg.logs,
        "active",
        `Проверка сертификата: действует до ${new Date(probe.expiresAt).toLocaleString("ru-RU")}.`,
      ),
    };
    await writeAcmeConfig(next);
    return next;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    const next: AcmeConfigV1 = {
      ...cfg,
      lastProbeAt: nowIso(),
      updatedAt: nowIso(),
      lastError: msg,
      logs: appendLog(cfg.logs, "failed", `Проверка сертификата завершилась ошибкой: ${msg}`, "error"),
    };
    await writeAcmeConfig(next);
    return next;
  }
}
