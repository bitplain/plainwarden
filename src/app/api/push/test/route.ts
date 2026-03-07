import { NextRequest, NextResponse } from "next/server";
import { getUserIdFromRequest } from "@/lib/server/auth";
import { sendPushToUser } from "@/lib/server/push-delivery";
import { updatePushReceiptForUser } from "@/lib/server/push-receipts-db";
import { getRateLimitResponse } from "@/lib/server/rate-limit";
import { HttpError, handleRouteError, readJsonBody } from "@/lib/server/validators";

const PUSH_TEST_RATE_LIMIT = {
  maxRequests: 5,
  windowMs: 60_000,
} as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function createTestTag(): string {
  return `push-test:${Date.now().toString(36)}:${Math.random().toString(36).slice(2, 10)}`;
}

function parseTargetEndpoint(value: unknown): string | undefined {
  if (typeof value !== "string" || !value.trim()) {
    return undefined;
  }

  const endpoint = value.trim();
  let parsed: URL;
  try {
    parsed = new URL(endpoint);
  } catch {
    throw new HttpError(400, "targetEndpoint must be a valid URL");
  }

  if (parsed.protocol !== "https:") {
    throw new HttpError(400, "targetEndpoint must use https");
  }

  return parsed.toString();
}

export async function POST(request: NextRequest) {
  try {
    const userId = getUserIdFromRequest(request);
    if (!userId) {
      throw new HttpError(401, "Unauthorized");
    }

    const rateLimitResponse = await getRateLimitResponse(
      request,
      "push-test",
      PUSH_TEST_RATE_LIMIT,
    );
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    const body = await readJsonBody(request, { maxSizeKB: 8 });
    if (!isRecord(body)) {
      throw new HttpError(400, "Invalid payload");
    }

    const title = typeof body.title === "string" && body.title.trim() ? body.title.trim() : "NetDen Reminder";
    const message = typeof body.message === "string" && body.message.trim() ? body.message.trim() : "Test push";
    const navigateTo = typeof body.navigateTo === "string" ? body.navigateTo : "/";
    const verifyToken = typeof body.verifyToken === "string" ? body.verifyToken.trim() : "";
    const targetEndpoint = parseTargetEndpoint(body.targetEndpoint);
    if (verifyToken && !/^[A-Za-z0-9-]{8,128}$/.test(verifyToken)) {
      throw new HttpError(400, "verifyToken is invalid");
    }

    const tag = verifyToken ? `push-verify:${verifyToken}` : createTestTag();
    const sent = await sendPushToUser({
      userId: userId,
      payload: {
        title,
        body: message,
        navigateTo,
        tag,
        verifyToken: verifyToken || undefined,
        renotify: true,
        requireInteraction: true,
      },
      requestId: request.headers.get("x-request-id") ?? undefined,
      targetEndpoint,
    });

    if (verifyToken && sent.sent > 0) {
      await updatePushReceiptForUser({
        userId,
        token: verifyToken,
        phase: "sent",
        userAgent: request.headers.get("user-agent")?.trim() ?? undefined,
      });
    }

    return NextResponse.json({
      ok: true,
      sent,
      verifyToken: verifyToken || null,
      deliveryStatus: sent.deliveryStatus,
      reason: sent.reason,
      retryRecommended: sent.retryRecommended,
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
