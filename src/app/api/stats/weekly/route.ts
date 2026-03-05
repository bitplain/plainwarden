import { NextRequest, NextResponse } from "next/server";
import { getUserIdFromRequest } from "@/lib/server/auth";
import { buildWeeklyStatsForUser } from "@/lib/server/tasks-db";
import {
  HttpError,
  handleRouteError,
} from "@/lib/server/validators";

export async function GET(request: NextRequest) {
  try {
    const userId = getUserIdFromRequest(request);
    if (!userId) {
      throw new HttpError(401, "Unauthorized");
    }

    const date = request.nextUrl.searchParams.get("date") ?? undefined;
    const stats = await buildWeeklyStatsForUser(userId, date);

    return NextResponse.json(stats);
  } catch (error) {
    return handleRouteError(error);
  }
}
