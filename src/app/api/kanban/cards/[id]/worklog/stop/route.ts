import { NextRequest, NextResponse } from "next/server";
import { bootstrapAuth, getAuthenticatedUser } from "@/lib/server/auth";
import { KanbanNotFoundError, stopWorklogTimer } from "@/lib/server/kanban-db";
import { HttpError, handleRouteError, readJsonBody } from "@/lib/server/validators";
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

    let note: string | undefined;
    const contentType = request.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
      const body = await readJsonBody(request);
      if (typeof body === "object" && body !== null && "note" in body) {
        const n = (body as Record<string, unknown>).note;
        if (typeof n === "string") note = n.trim();
      }
    }

    const log = await stopWorklogTimer(user.id, id, note);
    if (!log) throw new HttpError(404, "Card not found");
    return NextResponse.json(log);
  } catch (error) {
    if (error instanceof KanbanNotFoundError) {
      const body: ApiErrorResponse = { message: error.message };
      return NextResponse.json(body, { status: 404 });
    }
    return handleRouteError(error);
  }
}
