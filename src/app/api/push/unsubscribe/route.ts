import { NextRequest, NextResponse } from "next/server";
import { bootstrapAuth, getAuthenticatedUser } from "@/lib/server/auth";
import { disablePushSubscriptionForUser } from "@/lib/server/push-subscriptions-db";
import { HttpError, handleRouteError, readJsonBody } from "@/lib/server/validators";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export async function POST(request: NextRequest) {
  try {
    await bootstrapAuth();

    const user = await getAuthenticatedUser(request);
    if (!user) {
      throw new HttpError(401, "Unauthorized");
    }

    const body = await readJsonBody(request, { maxSizeKB: 16 });
    if (!isRecord(body) || typeof body.endpoint !== "string" || !body.endpoint.trim()) {
      throw new HttpError(400, "endpoint is required");
    }

    const removed = await disablePushSubscriptionForUser({
      userId: user.id,
      endpoint: body.endpoint,
    });

    return NextResponse.json({ ok: true, removed });
  } catch (error) {
    return handleRouteError(error);
  }
}
