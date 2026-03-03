import { NextRequest, NextResponse } from "next/server";
import { checkRateLimitAsync, getClientAddress } from "@/lib/server/rate-limit";
import {
  handleSetupError,
  isDatabaseConfigured,
  runEmergencyFactoryReset,
  validateSetupEmergencyFactoryResetInput,
} from "@/lib/server/setup";
import { HttpError, readJsonBody } from "@/lib/server/validators";
import { SetupEmergencyFactoryResetResponse } from "@/lib/types";

const FACTORY_RESET_RATE_LIMIT = {
  maxRequests: 10,
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
      `setup:emergency:factory-reset:${getClientAddress(request)}`,
      FACTORY_RESET_RATE_LIMIT,
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
    validateSetupEmergencyFactoryResetInput(body);
    await runEmergencyFactoryReset();

    console.warn("Emergency factory reset completed");

    const response: SetupEmergencyFactoryResetResponse = {
      ok: true,
      next: "/register",
    };
    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    return handleSetupError(error);
  }
}
