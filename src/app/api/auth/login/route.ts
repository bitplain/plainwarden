import { NextRequest, NextResponse } from "next/server";
import { authenticateUser, bootstrapAuth, sanitizeUser } from "@/lib/server/auth";
import {
  SESSION_COOKIE_NAME,
  createSessionToken,
  sessionCookieOptions,
} from "@/lib/server/session";
import {
  HttpError,
  handleRouteError,
  readJsonBody,
  validateLoginInput,
} from "@/lib/server/validators";
import { checkRateLimit, getClientAddress } from "@/lib/server/rate-limit";

const LOGIN_RATE_LIMIT = {
  maxRequests: 5,
  windowMs: 15 * 60 * 1000,
};

export async function POST(request: NextRequest) {
  try {
    await bootstrapAuth();

    const rateLimit = checkRateLimit(
      `auth:login:${getClientAddress(request)}`,
      LOGIN_RATE_LIMIT,
    );
    if (!rateLimit.allowed) {
      const response = NextResponse.json(
        { message: "Too many login attempts. Try again later." },
        { status: 429 },
      );
      response.headers.set("Retry-After", String(rateLimit.retryAfterSeconds));
      return response;
    }

    const body = await readJsonBody(request);
    const input = validateLoginInput(body);
    const user = await authenticateUser(input.email, input.password);

    if (!user) {
      throw new HttpError(401, "Invalid email or password");
    }

    const token = createSessionToken(user);
    const response = NextResponse.json({ user: sanitizeUser(user) });
    response.cookies.set(SESSION_COOKIE_NAME, token, sessionCookieOptions);

    return response;
  } catch (error) {
    return handleRouteError(error);
  }
}
