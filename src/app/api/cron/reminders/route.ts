import { NextRequest, NextResponse } from "next/server";
import { runReminderJob } from "@/lib/server/reminder-orchestrator";
import { HttpError, handleRouteError, readJsonBody } from "@/lib/server/validators";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function assertCronSecret(request: NextRequest) {
  const expected = process.env.NETDEN_CRON_SECRET?.trim();
  if (!expected) {
    throw new HttpError(503, "NETDEN_CRON_SECRET is not configured");
  }

  const headerSecret = request.headers.get("x-netden-cron-secret")?.trim();
  const authHeader = request.headers.get("authorization")?.trim();
  const bearerSecret = authHeader?.startsWith("Bearer ") ? authHeader.slice(7).trim() : null;

  if (headerSecret !== expected && bearerSecret !== expected) {
    throw new HttpError(401, "Invalid cron secret");
  }
}

export async function POST(request: NextRequest) {
  try {
    assertCronSecret(request);

    const body = await readJsonBody(request, { maxSizeKB: 16 }).catch(() => null);
    const payload = isRecord(body) ? body : {};

    const result = await runReminderJob({
      nowIso: typeof payload.nowIso === "string" ? payload.nowIso : undefined,
      userId: typeof payload.userId === "string" ? payload.userId : undefined,
      hourlyPushLimit:
        typeof payload.hourlyPushLimit === "number" && Number.isFinite(payload.hourlyPushLimit)
          ? Math.max(1, Math.floor(payload.hourlyPushLimit))
          : undefined,
    });

    return NextResponse.json({ ok: true, result });
  } catch (error) {
    return handleRouteError(error);
  }
}
