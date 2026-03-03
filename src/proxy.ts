import crypto from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { hasUsers } from "@/lib/server/json-db";
import {
  SESSION_COOKIE_NAME,
  hashSessionToken,
  isSessionActive,
  verifySessionToken,
} from "@/lib/server/session";
import { isDatabaseConfigured } from "@/lib/server/setup";

// Note: proxy always runs on Node.js runtime — no need to declare it explicitly

// ─── API route protection ────────────────────────────────────────────────────

/**
 * Routes that don't require session authentication.
 * All other /api/* routes are protected.
 */
const PUBLIC_API_ROUTES = new Set([
  "/api/auth/login",
  "/api/auth/logout", // must be accessible even when session is revoked
  "/api/auth/register",
  "/api/health",
  "/api/setup/run",
  "/api/setup/recover",
  "/api/setup/state",
  "/api/setup/preset",
  "/api/setup/emergency/state",
  "/api/setup/emergency/reset",
  "/api/setup/emergency/factory-reset",
  "/api/cron/reminders", // protected by NETDEN_CRON_SECRET, not session
]);

/** HTTP methods that mutate state — checked for CSRF */
const MUTATION_METHODS = new Set(["POST", "PATCH", "DELETE", "PUT"]);

async function handleApiRoute(request: NextRequest): Promise<NextResponse> {
  const { pathname } = request.nextUrl;

  if (PUBLIC_API_ROUTES.has(pathname)) {
    return NextResponse.next();
  }

  // CSRF protection for mutating requests:
  // If Sec-Fetch-Site header is present and equals "cross-site", reject.
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
  const tokenHash = hashSessionToken(token!);
  const active = await isSessionActive(tokenHash);
  if (!active) {
    return NextResponse.json({ message: "Session revoked" }, { status: 401 });
  }

  // Inject validated user info into request headers for downstream handlers.
  const requestId = crypto.randomUUID();
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-user-id", session.userId);
  requestHeaders.set("x-user-email", session.email);
  requestHeaders.set("x-request-id", requestId);

  const response = NextResponse.next({
    request: { headers: requestHeaders },
  });
  response.headers.set("x-request-id", requestId);
  return response;
}

// ─── Page routing ─────────────────────────────────────────────────────────────

const loginRoute = "/login";
const registerRoute = "/register";
const setupRoute = "/setup";
const homeRoute = "/";

function matchesRoute(pathname: string, route: string): boolean {
  return pathname === route || pathname.startsWith(`${route}/`);
}

async function handlePageRoute(request: NextRequest): Promise<NextResponse> {
  const pathname = request.nextUrl.pathname;
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const session = verifySessionToken(token);
  const isRegisterRoute = matchesRoute(pathname, registerRoute);
  const isLoginRoute = matchesRoute(pathname, loginRoute);
  const isSetupRoute = matchesRoute(pathname, setupRoute);
  const isHomeRoute = pathname === homeRoute;
  const hasDatabase = isDatabaseConfigured();

  if (!hasDatabase) {
    if (isHomeRoute || isSetupRoute) {
      return NextResponse.next();
    }
    return NextResponse.redirect(new URL(homeRoute, request.url));
  }

  const initialized = await hasUsers();

  if (isSetupRoute) {
    if (!initialized) {
      return NextResponse.redirect(new URL(registerRoute, request.url));
    }
    // Allow unauthenticated access to setup for recovery (forgot password).
    // Redirect to home only if the user already has an active session (normal mode).
    if (session) {
      return NextResponse.redirect(new URL(homeRoute, request.url));
    }
    return NextResponse.next();
  }

  if (!initialized) {
    if (!isRegisterRoute && !isHomeRoute) {
      return NextResponse.redirect(new URL(registerRoute, request.url));
    }
    return NextResponse.next();
  }

  if (session && (isLoginRoute || isRegisterRoute)) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  if (!session) {
    if (isHomeRoute || isLoginRoute) {
      return NextResponse.next();
    }
    const loginUrl = new URL(loginRoute, request.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

// ─── Entry point ─────────────────────────────────────────────────────────────

export async function proxy(request: NextRequest): Promise<NextResponse> {
  if (request.nextUrl.pathname.startsWith("/api/")) {
    return handleApiRoute(request);
  }
  return handlePageRoute(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
  ],
};
