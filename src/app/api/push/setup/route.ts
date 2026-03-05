import { NextRequest, NextResponse } from "next/server";
import { getUserIdFromRequest } from "@/lib/server/auth";
import { autoSetupPushRuntimeConfig } from "@/lib/server/push-runtime-config";
import { HttpError, handleRouteError, readJsonBody } from "@/lib/server/validators";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export async function POST(request: NextRequest) {
  try {
    const userId = getUserIdFromRequest(request);
    if (!userId) {
      throw new HttpError(401, "Unauthorized");
    }

    const body = await readJsonBody(request, { maxSizeKB: 8 }).catch(() => null);
    const payload = isRecord(body) ? body : {};
    const subject = typeof payload.subject === "string" ? payload.subject : undefined;

    const result = await autoSetupPushRuntimeConfig({ subject });
    return NextResponse.json({
      ok: true,
      ...result,
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
