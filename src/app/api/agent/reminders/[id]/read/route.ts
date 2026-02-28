import { NextRequest, NextResponse } from "next/server";
import { bootstrapAuth, getAuthenticatedUser } from "@/lib/server/auth";
import { markReminderReadForUser } from "@/lib/server/reminder-db";
import { HttpError, handleRouteError } from "@/lib/server/validators";

interface Params {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, { params }: Params) {
  try {
    await bootstrapAuth();
    const user = await getAuthenticatedUser(request);
    if (!user) {
      throw new HttpError(401, "Unauthorized");
    }

    const { id } = await params;
    if (!id) {
      throw new HttpError(400, "id is required");
    }

    const ok = await markReminderReadForUser(user.id, id);
    if (!ok) {
      throw new HttpError(404, "Reminder not found");
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleRouteError(error);
  }
}
