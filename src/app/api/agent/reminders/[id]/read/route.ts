import { NextRequest, NextResponse } from "next/server";
import { getUserIdFromRequest } from "@/lib/server/auth";
import { markReminderReadForUser } from "@/lib/server/reminder-db";
import { HttpError, handleRouteError } from "@/lib/server/validators";

interface Params {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const userId = getUserIdFromRequest(request);
    if (!userId) {
      throw new HttpError(401, "Unauthorized");
    }

    const { id } = await params;
    if (!id) {
      throw new HttpError(400, "id is required");
    }

    const ok = await markReminderReadForUser(userId, id);
    if (!ok) {
      throw new HttpError(404, "Reminder not found");
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleRouteError(error);
  }
}
