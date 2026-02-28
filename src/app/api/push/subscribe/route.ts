import { NextRequest, NextResponse } from "next/server";
import { bootstrapAuth, getAuthenticatedUser } from "@/lib/server/auth";
import { upsertPushSubscriptionForUser, type PushSubscriptionPayload } from "@/lib/server/push-subscriptions-db";
import { HttpError, handleRouteError, readJsonBody } from "@/lib/server/validators";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function parseSubscription(value: unknown): PushSubscriptionPayload {
  if (!isRecord(value)) {
    throw new HttpError(400, "subscription must be an object");
  }

  if (typeof value.endpoint !== "string" || !value.endpoint.trim()) {
    throw new HttpError(400, "subscription.endpoint is required");
  }

  if (!isRecord(value.keys)) {
    throw new HttpError(400, "subscription.keys is required");
  }

  if (typeof value.keys.p256dh !== "string" || typeof value.keys.auth !== "string") {
    throw new HttpError(400, "subscription.keys.p256dh/auth are required");
  }

  return {
    endpoint: value.endpoint,
    expirationTime: typeof value.expirationTime === "number" ? value.expirationTime : null,
    keys: {
      p256dh: value.keys.p256dh,
      auth: value.keys.auth,
    },
  };
}

export async function POST(request: NextRequest) {
  try {
    await bootstrapAuth();

    const user = await getAuthenticatedUser(request);
    if (!user) {
      throw new HttpError(401, "Unauthorized");
    }

    const body = await readJsonBody(request, { maxSizeKB: 32 });
    const payload = isRecord(body) ? body : null;
    if (!payload) {
      throw new HttpError(400, "Invalid payload");
    }

    const subscription = parseSubscription(payload.subscription);
    const created = await upsertPushSubscriptionForUser({
      userId: user.id,
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
