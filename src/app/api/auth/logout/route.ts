import { NextRequest, NextResponse } from "next/server";
import {
  SESSION_COOKIE_NAME,
  getSessionCookieOptions,
  revokeSessionToken,
} from "@/lib/server/session";
import { handleRouteError } from "@/lib/server/validators";

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
    if (token) {
      await revokeSessionToken(token);
    }

    const response = NextResponse.json({ success: true });
    response.cookies.set(SESSION_COOKIE_NAME, "", {
      ...getSessionCookieOptions(request),
      maxAge: 0,
    });
    return response;
  } catch (error) {
    return handleRouteError(error);
  }
}
