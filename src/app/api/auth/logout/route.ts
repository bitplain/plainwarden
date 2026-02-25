import { NextResponse } from "next/server";
import { SESSION_COOKIE_NAME } from "@/lib/server/session";
import { handleRouteError } from "@/lib/server/validators";

export async function POST() {
  try {
    const response = NextResponse.json({ success: true });
    response.cookies.set(SESSION_COOKIE_NAME, "", {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 0,
    });
    return response;
  } catch (error) {
    return handleRouteError(error);
  }
}
