export interface PushForegroundToast {
  title: string;
  body: string;
  navigateTo?: string;
  tag?: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function readOptionalString(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export function parsePushForegroundMessage(value: unknown): PushForegroundToast | null {
  if (!isRecord(value) || value.type !== "netden-push-foreground" || !isRecord(value.payload)) {
    return null;
  }

  const title = readOptionalString(value.payload.title);
  const body = readOptionalString(value.payload.body);
  if (!title || !body) {
    return null;
  }

  return {
    title,
    body,
    navigateTo: readOptionalString(value.payload.navigateTo),
    tag: readOptionalString(value.payload.tag),
  };
}
