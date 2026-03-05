import { NextRequest, NextResponse } from "next/server";
import { getUserIdFromRequest } from "@/lib/server/auth";
import { upsertPushSubscriptionForUser, type PushSubscriptionPayload } from "@/lib/server/push-subscriptions-db";
import { HttpError, handleRouteError, readJsonBody } from "@/lib/server/validators";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function normalizeBase64UrlKey(value: unknown, fieldName: string): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new HttpError(400, `${fieldName} is required`);
  }

  const normalized = value
    .trim()
    .replace(/\s+/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");

  if (!/^[A-Za-z0-9_-]{16,}$/.test(normalized)) {
    throw new HttpError(400, `${fieldName} must be base64url`);
  }

  return normalized;
}

function parseEndpoint(value: unknown): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new HttpError(400, "subscription.endpoint is required");
  }

  const endpoint = value.trim();
  let parsed: URL;
  try {
    parsed = new URL(endpoint);
  } catch {
    throw new HttpError(400, "subscription.endpoint is invalid URL");
  }

  if (parsed.protocol !== "https:") {
    throw new HttpError(400, "subscription.endpoint must use https");
  }

  return parsed.toString();
}

function parseExpirationTime(value: unknown): number | null {
  if (value === null || typeof value === "undefined") {
    return null;
  }

  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    throw new HttpError(400, "subscription.expirationTime must be null or positive number");
  }

  return Math.floor(value);
}

function parseSubscription(value: unknown): PushSubscriptionPayload {
  if (!isRecord(value)) {
    throw new HttpError(400, "subscription must be an object");
  }

  if (!isRecord(value.keys)) {
    throw new HttpError(400, "subscription.keys is required");
  }

  return {
    endpoint: parseEndpoint(value.endpoint),
    expirationTime: parseExpirationTime(value.expirationTime),
    keys: {
      p256dh: normalizeBase64UrlKey(value.keys.p256dh, "subscription.keys.p256dh"),
      auth: normalizeBase64UrlKey(value.keys.auth, "subscription.keys.auth"),
    },
  };
}

export async function POST(request: NextRequest) {
  try {
    const userId = getUserIdFromRequest(request);
    if (!userId) {
      throw new HttpError(401, "Unauthorized");
    }

    const body = await readJsonBody(request, { maxSizeKB: 32 });
    const payload = isRecord(body) ? body : null;
    if (!payload) {
      throw new HttpError(400, "Invalid payload");
    }

    const subscription = parseSubscription(payload.subscription);
    const created = await upsertPushSubscriptionForUser({
      userId: userId,
      subscription,
      userAgent: request.headers.get("user-agent") || undefined,
    });

    return NextResponse.json({
      ok: true,
      id: created.id,
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
