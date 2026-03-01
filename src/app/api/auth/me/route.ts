import { NextRequest, NextResponse } from "next/server";
import { sanitizeUser, getUserIdFromRequest } from "@/lib/server/auth";
import { findUserById } from "@/lib/server/json-db";
import { HttpError, handleRouteError } from "@/lib/server/validators";

export async function GET(request: NextRequest) {
  try {
    const userId = getUserIdFromRequest(request);
    if (!userId) {
      throw new HttpError(401, "Unauthorized");
    }
    const user = await findUserById(userId);
    if (!user) {
      throw new HttpError(401, "Unauthorized");
    }

    return NextResponse.json({ user: sanitizeUser(user) });
  } catch (error) {
    return handleRouteError(error);
  }
}
