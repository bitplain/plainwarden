import { NextRequest, NextResponse } from "next/server";
import { authenticateUser, bootstrapAuth, sanitizeUser } from "@/lib/server/auth";
import {
  SESSION_COOKIE_NAME,
  createSessionToken,
  getSessionCookieOptions,
  persistSessionToken,
} from "@/lib/server/session";
import {
  HttpError,
  handleRouteError,
  readJsonBody,
  validateLoginInput,
} from "@/lib/server/validators";
import { checkRateLimitAsync, getClientAddress } from "@/lib/server/rate-limit";

const LOGIN_RATE_LIMIT = {
  maxRequests: 5,
  windowMs: 15 * 60 * 1000,
};

export async function POST(request: NextRequest) {
  try {
    await bootstrapAuth();

    const rateLimit = await checkRateLimitAsync(
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
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await persistSessionToken(token, user.id, expiresAt);

    const response = NextResponse.json({ user: sanitizeUser(user) });
    response.cookies.set(SESSION_COOKIE_NAME, token, getSessionCookieOptions(request));

    return response;
  } catch (error) {
    return handleRouteError(error);
  }
}
