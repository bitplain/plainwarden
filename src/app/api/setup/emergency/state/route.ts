import { NextRequest, NextResponse } from "next/server";
import { checkRateLimitAsync, getClientAddress } from "@/lib/server/rate-limit";
import {
  handleSetupError,
  isDatabaseConfigured,
  listEmergencyRecoveryAccounts,
} from "@/lib/server/setup";
import { HttpError } from "@/lib/server/validators";
import { SetupEmergencyStateResponse } from "@/lib/types";

const STATE_RATE_LIMIT = {
  maxRequests: 20,
  windowMs: 15 * 60 * 1000,
};

const EMERGENCY_WARNING =
  "Emergency recovery is enabled. Use only in trusted self-hosted environments.";

export async function GET(request: NextRequest) {
  try {
    if (!isDatabaseConfigured()) {
      throw new HttpError(
        503,
        "Emergency recovery is unavailable because DATABASE_URL is not configured",
      );
    }

    const rate = await checkRateLimitAsync(
      `setup:emergency:state:${getClientAddress(request)}`,
      STATE_RATE_LIMIT,
    );
    if (!rate.allowed) {
      const response = NextResponse.json(
        { error: "Too many recovery attempts. Try again later." },
        { status: 429 },
      );
      response.headers.set("Retry-After", String(rate.retryAfterSeconds));
      return response;
    }

    const accounts = await listEmergencyRecoveryAccounts();
    if (accounts.length === 0) {
      throw new HttpError(409, "Emergency recovery requires at least one existing user");
    }

    const response: SetupEmergencyStateResponse = {
      ok: true,
      accounts,
      legacyRecoveryEndpoint: "/api/setup/recover",
      warning: EMERGENCY_WARNING,
    };
    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    return handleSetupError(error);
  }
}
