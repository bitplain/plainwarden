import { NextRequest, NextResponse } from "next/server";
import { hasUsers } from "@/lib/server/json-db";
import { SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/server/session";
import { isDatabaseConfigured } from "@/lib/server/setup";

const loginRoute = "/login";
const registerRoute = "/register";
const setupRoute = "/setup";
const homeRoute = "/";

function matchesRoute(pathname: string, route: string): boolean {
  return pathname === route || pathname.startsWith(`${route}/`);
}

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const session = verifySessionToken(token);
  const isRegisterRoute = matchesRoute(pathname, registerRoute);
  const isLoginRoute = matchesRoute(pathname, loginRoute);
  const isSetupRoute = matchesRoute(pathname, setupRoute);
  const isHomeRoute = pathname === homeRoute;
  const hasDatabase = isDatabaseConfigured();

  if (!hasDatabase) {
    // First run: open the terminal workspace and let user trigger /setup explicitly.
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
    // Setup is no longer available once initialization is complete.
    return NextResponse.redirect(new URL(homeRoute, request.url));
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

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
  ],
};
