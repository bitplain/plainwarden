import crypto from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import {
  SESSION_COOKIE_NAME,
  hashSessionToken,
  isSessionActive,
  verifySessionToken,
} from "@/lib/server/session";

// Use Node.js runtime — required for node:crypto and Prisma DB access
export const runtime = "nodejs";

/**
 * Routes that don't require session authentication.
 * All other /api/* routes are protected.
 */
const PUBLIC_API_ROUTES = new Set([
  "/api/auth/login",
  "/api/auth/register",
  "/api/health",
  "/api/setup/run",
  "/api/setup/recover",
  "/api/setup/state",
  "/api/cron/reminders", // protected by NETDEN_CRON_SECRET, not session
]);

/** HTTP methods that mutate state — checked for CSRF */
const MUTATION_METHODS = new Set(["POST", "PATCH", "DELETE", "PUT"]);

export async function middleware(request: NextRequest): Promise<NextResponse> {
  const { pathname } = request.nextUrl;

  // Only intercept /api/* routes
  if (!pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  // Allow public routes through without auth
  if (PUBLIC_API_ROUTES.has(pathname)) {
    return NextResponse.next();
  }

  // CSRF protection for mutating requests:
  // If Sec-Fetch-Site header is present and equals "cross-site", reject.
  // Same-origin and same-site requests (including requests without this header
  // from older clients) are allowed through — cookie sameSite:"lax" provides
  // the primary cross-origin protection for form-based attacks.
  if (MUTATION_METHODS.has(request.method)) {
    const secFetchSite = request.headers.get("sec-fetch-site");
    if (secFetchSite === "cross-site") {
      return NextResponse.json(
        { message: "Cross-origin requests are not allowed" },
        { status: 403 },
      );
    }
  }

  // Session validation (HMAC signature + expiry)
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const session = verifySessionToken(token);

  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  // Whitelist check — ensures revoked sessions are rejected
  // Falls back to allowing the request if DB is unavailable (fail open)
  const tokenHash = hashSessionToken(token!);
  const active = await isSessionActive(tokenHash);
  if (!active) {
    return NextResponse.json({ message: "Session revoked" }, { status: 401 });
  }

  // Inject validated user info into request headers for downstream handlers.
  // Routes can read X-User-Id instead of re-verifying the session token.
  const requestId = crypto.randomUUID();
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-user-id", session.userId);
  requestHeaders.set("x-user-email", session.email);
  requestHeaders.set("x-request-id", requestId);

  const response = NextResponse.next({
    request: { headers: requestHeaders },
  });

  // Expose request ID in response for client-side error correlation
  response.headers.set("x-request-id", requestId);

  return response;
}

export const config = {
  matcher: "/api/:path*",
};
