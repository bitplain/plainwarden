import { NextRequest, NextResponse } from "next/server";
import { getUserIdFromRequest } from "@/lib/server/auth";
import { deleteBoardForUser, getBoardForUser, updateBoardForUser } from "@/lib/server/kanban-db";
import { HttpError, handleRouteError, readJsonBody } from "@/lib/server/validators";
import { validateUpdateBoardInput } from "@/lib/server/kanban-validators";

interface Params {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: Params) {
  try {
    const userId = getUserIdFromRequest(request);
    if (!userId) {
      throw new HttpError(401, "Unauthorized");
    }

    const { id } = await params;
    const board = await getBoardForUser(userId, id);
    if (!board) throw new HttpError(404, "Board not found");
    return NextResponse.json(board);
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const userId = getUserIdFromRequest(request);
    if (!userId) {
      throw new HttpError(401, "Unauthorized");
    }

    const { id } = await params;
    const body = await readJsonBody(request);
    const input = validateUpdateBoardInput(body);
    const board = await updateBoardForUser(userId, id, input);
    if (!board) throw new HttpError(404, "Board not found");
    return NextResponse.json(board);
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const userId = getUserIdFromRequest(request);
    if (!userId) {
      throw new HttpError(401, "Unauthorized");
    }

    const { id } = await params;
    const deleted = await deleteBoardForUser(userId, id);
    if (!deleted) throw new HttpError(404, "Board not found");
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return handleRouteError(error);
  }
}
