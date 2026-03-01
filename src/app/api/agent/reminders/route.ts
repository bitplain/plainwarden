import { NextRequest, NextResponse } from "next/server";
import { getUserIdFromRequest } from "@/lib/server/auth";
import { listUnreadRemindersForUser } from "@/lib/server/reminder-db";
import { HttpError, handleRouteError } from "@/lib/server/validators";

export async function GET(request: NextRequest) {
  try {
    const userId = getUserIdFromRequest(request);
    if (!userId) {
      throw new HttpError(401, "Unauthorized");
    }

    const limitRaw = request.nextUrl.searchParams.get("limit");
    const limit = limitRaw ? Math.max(1, Math.min(100, Number(limitRaw))) : 20;

    const reminders = await listUnreadRemindersForUser(userId, Number.isFinite(limit) ? limit : 20);

    return NextResponse.json({ reminders });
  } catch (error) {
    return handleRouteError(error);
  }
}
