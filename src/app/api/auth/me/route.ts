import { NextRequest, NextResponse } from "next/server";
import { bootstrapAuth, getAuthenticatedUser, sanitizeUser } from "@/lib/server/auth";
import { HttpError, handleRouteError } from "@/lib/server/validators";

export async function GET(request: NextRequest) {
  try {
    await bootstrapAuth();

    const user = await getAuthenticatedUser(request);
    if (!user) {
      throw new HttpError(401, "Unauthorized");
    }

    return NextResponse.json({ user: sanitizeUser(user) });
  } catch (error) {
    return handleRouteError(error);
  }
}
