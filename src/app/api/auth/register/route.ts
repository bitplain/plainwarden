import { NextRequest, NextResponse } from "next/server";
import {
  bootstrapAuth,
  isSystemInitialized,
  registerUser,
  sanitizeUser,
} from "@/lib/server/auth";
import {
  SESSION_COOKIE_NAME,
  createSessionToken,
  sessionCookieOptions,
} from "@/lib/server/session";
import {
  HttpError,
  handleRouteError,
  readJsonBody,
  validateRegisterInput,
} from "@/lib/server/validators";
import { checkRateLimit, getClientAddress } from "@/lib/server/rate-limit";

const REGISTER_RATE_LIMIT = {
  maxRequests: 5,
  windowMs: 15 * 60 * 1000,
};

export async function POST(request: NextRequest) {
  try {
    await bootstrapAuth();

    const rateLimit = checkRateLimit(
      `auth:register:${getClientAddress(request)}`,
      REGISTER_RATE_LIMIT,
    );
    if (!rateLimit.allowed) {
      const response = NextResponse.json(
        { message: "Too many registration attempts. Try again later." },
        { status: 429 },
      );
      response.headers.set("Retry-After", String(rateLimit.retryAfterSeconds));
      return response;
    }

    const initialized = await isSystemInitialized();
    if (initialized) {
      throw new HttpError(403, "Registration is closed");
    }

    const body = await readJsonBody(request);
    const input = validateRegisterInput(body);

    const user = await registerUser(input, { mustBeFirst: true });
    const response = NextResponse.json({ user: sanitizeUser(user) }, { status: 201 });
    const sessionToken = createSessionToken(user);
    response.cookies.set(SESSION_COOKIE_NAME, sessionToken, sessionCookieOptions);

    return response;
  } catch (error) {
    return handleRouteError(error);
  }
}
