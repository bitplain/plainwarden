export interface BillingMetric {
  quantity: number;
  unit: string | null;
  netAmount: number;
  rows: number;
}

export interface GitHubBillingUsageSummary {
  copilotPremium: BillingMetric;
  actions: BillingMetric;
  codespaces: BillingMetric;
}

interface UsageRow {
  label: string;
  quantity: number;
  unit: string | null;
  netAmount: number;
}

const GITHUB_API_BASE = "https://api.github.com";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function asNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function asString(value: unknown): string | null {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  return null;
}

function readString(record: Record<string, unknown>, keys: string[]): string | null {
  for (const key of keys) {
    const value = asString(record[key]);
    if (value) return value;
  }
  return null;
}

function readNumber(record: Record<string, unknown>, keys: string[]): number | null {
  for (const key of keys) {
    const value = asNumber(record[key]);
    if (value !== null) return value;
  }
  return null;
}

function buildUsageRow(record: Record<string, unknown>): UsageRow | null {
  const product = readString(record, ["product", "productName", "name", "feature"]);
  const sku = readString(record, ["sku"]);

  if (!product && !sku) {
    return null;
  }

  const quantity = readNumber(record, [
    "quantity",
    "totalQuantity",
    "total_quantity",
    "usage",
    "used",
    "value",
    "minutes",
  ]);

  const unit =
    readString(record, ["unitType", "unit_type", "unit", "uom"]) ??
    readString(record, ["usageUnit", "measurementUnit"]);
  const netAmount = readNumber(record, [
    "netAmount",
    "net_amount",
    "cost",
    "totalCost",
    "amountUsd",
    "grossAmount",
  ]);

  return {
    label: `${product ?? ""} ${sku ?? ""}`.trim(),
    quantity: quantity ?? 0,
    unit,
    netAmount: netAmount ?? 0,
  };
}

function collectRows(payload: unknown): UsageRow[] {
  const rows: UsageRow[] = [];

  const visit = (value: unknown) => {
    if (Array.isArray(value)) {
      for (const item of value) {
        visit(item);
      }
      return;
    }

    if (!isRecord(value)) {
      return;
    }

    const row = buildUsageRow(value);
    if (row) {
      rows.push(row);
    }

    for (const child of Object.values(value)) {
      if (Array.isArray(child) || isRecord(child)) {
        visit(child);
      }
    }
  };

  visit(payload);
  return rows;
}

function buildMetric(rows: UsageRow[]): BillingMetric {
  return {
    quantity: rows.reduce((sum, row) => sum + row.quantity, 0),
    unit: rows.find((row) => row.unit)?.unit ?? null,
    netAmount: rows.reduce((sum, row) => sum + row.netAmount, 0),
    rows: rows.length,
  };
}

function matchBucket(row: UsageRow): "copilotPremium" | "actions" | "codespaces" | null {
  const value = row.label.toLowerCase();

  if (value.includes("codespaces")) {
    return "codespaces";
  }

  if (value.includes("actions")) {
    return "actions";
  }

  if (value.includes("copilot") && (value.includes("premium") || value.includes("request"))) {
    return "copilotPremium";
  }

  return null;
}

export function aggregateGitHubBillingUsage(payload: unknown): GitHubBillingUsageSummary {
  const rows = collectRows(payload);
  const buckets: Record<keyof GitHubBillingUsageSummary, UsageRow[]> = {
    copilotPremium: [],
    actions: [],
    codespaces: [],
  };

  for (const row of rows) {
    const bucket = matchBucket(row);
    if (!bucket) continue;
    buckets[bucket].push(row);
  }

  return {
    copilotPremium: buildMetric(buckets.copilotPremium),
    actions: buildMetric(buckets.actions),
    codespaces: buildMetric(buckets.codespaces),
  };
}

export interface FetchGitHubBillingInput {
  org: string;
  token: string;
  period?: {
    year?: number;
    month?: number;
  };
}

export interface GitHubBillingFetchResult {
  usage: unknown;
  summary: unknown | null;
  aggregate: GitHubBillingUsageSummary;
}

async function parseResponsePayload(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

function buildErrorMessage(payload: unknown, fallback: string): string {
  if (isRecord(payload)) {
    const message = asString(payload.message);
    if (message) return message;
  }
  return fallback;
}

export async function fetchGitHubBillingUsage(
  input: FetchGitHubBillingInput,
): Promise<GitHubBillingFetchResult> {
  const org = input.org.trim();
  const token = input.token.trim();

  const headers = {
    Accept: "application/vnd.github+json",
    Authorization: `Bearer ${token}`,
    "X-GitHub-Api-Version": "2022-11-28",
  };

  const usageUrl = new URL(
    `${GITHUB_API_BASE}/organizations/${encodeURIComponent(org)}/settings/billing/usage`,
  );
  if (input.period?.year) usageUrl.searchParams.set("year", String(input.period.year));
  if (input.period?.month) usageUrl.searchParams.set("month", String(input.period.month));

  const usageResponse = await fetch(usageUrl.toString(), {
    method: "GET",
    headers,
    cache: "no-store",
  });

  const usagePayload = await parseResponsePayload(usageResponse);

  if (!usageResponse.ok) {
    const fallback = `GitHub billing request failed (${usageResponse.status})`;
    throw new Error(buildErrorMessage(usagePayload, fallback));
  }

  const summaryUrl = new URL(
    `${GITHUB_API_BASE}/organizations/${encodeURIComponent(org)}/settings/billing/usage/summary`,
  );
  if (input.period?.year) summaryUrl.searchParams.set("year", String(input.period.year));
  if (input.period?.month) summaryUrl.searchParams.set("month", String(input.period.month));

  const summaryResponse = await fetch(summaryUrl.toString(), {
    method: "GET",
    headers,
    cache: "no-store",
  });

  let summaryPayload: unknown | null = null;
  if (summaryResponse.ok) {
    summaryPayload = await parseResponsePayload(summaryResponse);
  }

  const aggregate = aggregateGitHubBillingUsage({
    usage: usagePayload,
    summary: summaryPayload,
  });

  return {
    usage: usagePayload,
    summary: summaryPayload,
    aggregate,
  };
}
