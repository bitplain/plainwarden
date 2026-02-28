import { NextRequest, NextResponse } from "next/server";
import { bootstrapAuth, getAuthenticatedUser } from "@/lib/server/auth";
import { deleteCommentForUser, updateCommentForUser } from "@/lib/server/kanban-db";
import { HttpError, handleRouteError, readJsonBody } from "@/lib/server/validators";
import { validateUpdateCommentInput } from "@/lib/server/kanban-validators";

interface Params {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    await bootstrapAuth();
    const user = await getAuthenticatedUser(request);
    if (!user) throw new HttpError(401, "Unauthorized");

    const { id } = await params;
    const body = await readJsonBody(request);
    const input = validateUpdateCommentInput(body);
    const comment = await updateCommentForUser(user.id, id, input);
    if (!comment) throw new HttpError(404, "Comment not found");
    return NextResponse.json(comment);
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    await bootstrapAuth();
    const user = await getAuthenticatedUser(request);
    if (!user) throw new HttpError(401, "Unauthorized");

    const { id } = await params;
    const deleted = await deleteCommentForUser(user.id, id);
    if (!deleted) throw new HttpError(404, "Comment not found");
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return handleRouteError(error);
  }
}
