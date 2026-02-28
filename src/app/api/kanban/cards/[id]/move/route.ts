import { NextRequest, NextResponse } from "next/server";
import { bootstrapAuth, getAuthenticatedUser } from "@/lib/server/auth";
import { KanbanDependencyBlockedError, moveCardForUser } from "@/lib/server/kanban-db";
import { HttpError, handleRouteError, readJsonBody } from "@/lib/server/validators";
import { validateMoveCardInput } from "@/lib/server/kanban-validators";
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
    const body = await readJsonBody(request);
    const input = validateMoveCardInput(body);
    const card = await moveCardForUser(user.id, id, input);
    if (!card) throw new HttpError(404, "Card not found");
    return NextResponse.json(card);
  } catch (error) {
    if (error instanceof KanbanDependencyBlockedError) {
      const body: ApiErrorResponse = { message: error.message };
      return NextResponse.json(body, { status: 409 });
    }
    return handleRouteError(error);
  }
}
