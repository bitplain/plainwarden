import { NextRequest, NextResponse } from "next/server";
import { getUserIdFromRequest } from "@/lib/server/auth";
import { panicResetTasksForUser } from "@/lib/server/tasks-db";
import {
  HttpError,
  handleRouteError,
  readJsonBody,
} from "@/lib/server/validators";

export async function POST(request: NextRequest) {
  try {
    const userId = getUserIdFromRequest(request);
    if (!userId) {
      throw new HttpError(401, "Unauthorized");
    }

    const body = await readJsonBody(request);
    const fromDate =
      typeof (body as { fromDate?: unknown }).fromDate === "string"
        ? (body as { fromDate: string }).fromDate
        : undefined;

    const result = await panicResetTasksForUser(userId, fromDate);
    return NextResponse.json(result);
  } catch (error) {
    return handleRouteError(error);
  }
}
