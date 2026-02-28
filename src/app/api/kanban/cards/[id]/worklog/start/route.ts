import { NextRequest, NextResponse } from "next/server";
import { bootstrapAuth, getAuthenticatedUser } from "@/lib/server/auth";
import { KanbanActiveTimerError, startWorklogTimer } from "@/lib/server/kanban-db";
import { HttpError, handleRouteError } from "@/lib/server/validators";
import { ApiErrorResponse } from "@/lib/types";

interface Params {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, { params }: Params) {
  try {
    await bootstrapAuth();
    const user = await getAuthenticatedUser(request);
    if (!user) throw new HttpError(401, "Unauthorized");

    const { id } = await params;
    const log = await startWorklogTimer(user.id, id);
    if (!log) throw new HttpError(404, "Card not found");
    return NextResponse.json(log, { status: 201 });
  } catch (error) {
    if (error instanceof KanbanActiveTimerError) {
      const body: ApiErrorResponse = { message: error.message };
      return NextResponse.json(body, { status: 409 });
    }
    return handleRouteError(error);
  }
}
