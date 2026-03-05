import { NextRequest, NextResponse } from "next/server";
import { getUserIdFromRequest } from "@/lib/server/auth";
import { getPushReceiptForUser, updatePushReceiptForUser } from "@/lib/server/push-receipts-db";
import { HttpError, handleRouteError, readJsonBody } from "@/lib/server/validators";

type PushReceiptPhase = "received" | "shown";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function parseToken(value: unknown): string {
  if (typeof value !== "string") {
    throw new HttpError(400, "token is required");
  }
  const token = value.trim();
  if (!/^[A-Za-z0-9-]{8,128}$/.test(token)) {
    throw new HttpError(400, "token is invalid");
  }
  return token;
}

function parsePhase(value: unknown): PushReceiptPhase {
  if (value === "received" || value === "shown") {
    return value;
  }
  throw new HttpError(400, "phase must be either 'received' or 'shown'");
}

export async function GET(request: NextRequest) {
  try {
    const userId = getUserIdFromRequest(request);
    if (!userId) {
      throw new HttpError(401, "Unauthorized");
    }

    const token = parseToken(request.nextUrl.searchParams.get("token"));
    const receipt = await getPushReceiptForUser({ userId, token });

    return NextResponse.json(
      { ok: true, receipt },
      {
        headers: {
          "cache-control": "no-store",
        },
      },
    );
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = getUserIdFromRequest(request);
    if (!userId) {
      throw new HttpError(401, "Unauthorized");
    }

    const body = await readJsonBody(request, { maxSizeKB: 8 });
    if (!isRecord(body)) {
      throw new HttpError(400, "Invalid payload");
    }

    const token = parseToken(body.token);
    const phase = parsePhase(body.phase);
    const userAgent = request.headers.get("user-agent")?.trim() ?? undefined;

    const receipt = await updatePushReceiptForUser({
      userId,
      token,
      phase,
      userAgent,
    });

    return NextResponse.json({ ok: true, receipt });
  } catch (error) {
    return handleRouteError(error);
  }
}
