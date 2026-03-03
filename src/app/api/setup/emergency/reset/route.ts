import { NextRequest, NextResponse } from "next/server";
import { checkRateLimitAsync, getClientAddress } from "@/lib/server/rate-limit";
import {
  handleSetupError,
  isDatabaseConfigured,
  resetEmergencyPasswordByUserId,
  validateSetupEmergencyResetInput,
} from "@/lib/server/setup";
import { HttpError, readJsonBody } from "@/lib/server/validators";
import { SetupEmergencyResetResponse } from "@/lib/types";

const RESET_RATE_LIMIT = {
  maxRequests: 5,
  windowMs: 15 * 60 * 1000,
};

export async function POST(request: NextRequest) {
  try {
    if (!isDatabaseConfigured()) {
      throw new HttpError(
        503,
        "Emergency recovery is unavailable because DATABASE_URL is not configured",
      );
    }

    const rate = await checkRateLimitAsync(
      `setup:emergency:reset:${getClientAddress(request)}`,
      RESET_RATE_LIMIT,
    );
    if (!rate.allowed) {
      const response = NextResponse.json(
        { error: "Too many recovery attempts. Try again later." },
        { status: 429 },
      );
      response.headers.set("Retry-After", String(rate.retryAfterSeconds));
      return response;
    }

    const body = await readJsonBody(request, { maxSizeKB: 32 });
    const input = validateSetupEmergencyResetInput(body);
    const result = await resetEmergencyPasswordByUserId(input);

    const response: SetupEmergencyResetResponse = {
      ok: true,
      loginEmail: result.email,
    };
    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    return handleSetupError(error);
  }
}
