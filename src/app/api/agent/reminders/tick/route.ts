import { NextRequest, NextResponse } from "next/server";
import { getUserIdFromRequest } from "@/lib/server/auth";
import { runReminderJob } from "@/lib/server/reminder-orchestrator";
import { HttpError, handleRouteError, readJsonBody } from "@/lib/server/validators";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function readSource(value: unknown): "calendar-local-timer" | "manual" {
  if (value === "calendar-local-timer" || value === "manual") {
    return value;
  }
  return "manual";
}

export async function POST(request: NextRequest) {
  try {
    const userId = getUserIdFromRequest(request);
    if (!userId) {
      throw new HttpError(401, "Unauthorized");
    }

    const body = await readJsonBody(request, { maxSizeKB: 8 }).catch(() => null);
    const payload = isRecord(body) ? body : {};
    const source = readSource(payload.source);
    const nowIso = typeof payload.nowIso === "string" ? payload.nowIso : undefined;

    const result = await runReminderJob({
      nowIso,
      userId,
    });

    const summary = result.users[0] ?? {
      userId,
      candidates: 0,
      created: 0,
      pushAllowed: 0,
      pushDropped: 0,
      pushSent: 0,
      pushRetried: 0,
      pushRetryScheduled: 0,
      pushFailedFinal: 0,
      retried: 0,
    };

    return NextResponse.json({
      ok: true,
      source,
      result: {
        ...summary,
        nowIso: result.nowIso,
      },
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
