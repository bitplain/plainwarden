export interface OpenRouterModelOption {
  id: string;
  label: string;
}

export class OpenRouterApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "OpenRouterApiError";
    this.status = status;
  }
}

function parseLabel(item: Record<string, unknown>): string {
  if (typeof item.name === "string" && item.name.trim()) {
    return item.name.trim();
  }
  if (typeof item.id === "string" && item.id.trim()) {
    return item.id.trim();
  }
  return "unknown-model";
}

export function normalizeOpenRouterModels(payload: unknown): OpenRouterModelOption[] {
  if (!payload || typeof payload !== "object") return [];

  const data = (payload as { data?: unknown }).data;
  if (!Array.isArray(data)) return [];

  const seen = new Set<string>();
  const result: OpenRouterModelOption[] = [];

  for (const row of data) {
    if (!row || typeof row !== "object") continue;
    const item = row as Record<string, unknown>;
    const id = typeof item.id === "string" ? item.id.trim() : "";
    if (!id || seen.has(id)) continue;
    seen.add(id);
    result.push({
      id,
      label: parseLabel(item),
    });
  }

  return result.sort((a, b) => a.id.localeCompare(b.id));
}

function buildHeaders(apiKey: string): HeadersInit {
  return {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  };
}

export async function validateOpenRouterKey(apiKey: string): Promise<{ valid: boolean; status?: number }> {
  const response = await fetch("https://openrouter.ai/api/v1/models/user", {
    method: "GET",
    headers: buildHeaders(apiKey),
  });

  if (response.ok) {
    return { valid: true };
  }

  if (response.status === 401) {
    return { valid: false, status: 401 };
  }

  throw new OpenRouterApiError(response.status, `OpenRouter validation failed (HTTP ${response.status})`);
}

export async function listOpenRouterModels(apiKey: string): Promise<OpenRouterModelOption[]> {
  const response = await fetch("https://openrouter.ai/api/v1/models", {
    method: "GET",
    headers: buildHeaders(apiKey),
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new OpenRouterApiError(401, "OpenRouter API key is invalid");
    }
    throw new OpenRouterApiError(response.status, `OpenRouter models failed (HTTP ${response.status})`);
  }

  const payload = (await response.json()) as unknown;
  return normalizeOpenRouterModels(payload);
}
