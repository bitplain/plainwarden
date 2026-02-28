import { NextRequest, NextResponse } from "next/server";
import { bootstrapAuth, getAuthenticatedUser } from "@/lib/server/auth";
import { createBoardForUser, listBoardsForUser } from "@/lib/server/kanban-db";
import { HttpError, handleRouteError, readJsonBody } from "@/lib/server/validators";
import { validateCreateBoardInput } from "@/lib/server/kanban-validators";

export async function GET(request: NextRequest) {
  try {
    await bootstrapAuth();
    const user = await getAuthenticatedUser(request);
    if (!user) throw new HttpError(401, "Unauthorized");

    const boards = await listBoardsForUser(user.id);
    return NextResponse.json(boards);
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    await bootstrapAuth();
    const user = await getAuthenticatedUser(request);
    if (!user) throw new HttpError(401, "Unauthorized");

    const body = await readJsonBody(request);
    const input = validateCreateBoardInput(body);
    const board = await createBoardForUser(user.id, input);
    return NextResponse.json(board, { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}
