import { NextRequest, NextResponse } from "next/server";
import { getUserIdFromRequest } from "@/lib/server/auth";
import { deleteNoteForUser, getNoteForUser, updateNoteForUser } from "@/lib/server/notes-db";
import { HttpError, handleRouteError, readJsonBody, validateUpdateNoteInput } from "@/lib/server/validators";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = getUserIdFromRequest(request);
    if (!userId) {
      throw new HttpError(401, "Unauthorized");
    }

    const { id } = await params;
    const note = await getNoteForUser(userId, id);
    if (!note) {
      throw new HttpError(404, "Note not found");
    }

    return NextResponse.json(note);
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = getUserIdFromRequest(request);
    if (!userId) {
      throw new HttpError(401, "Unauthorized");
    }

    const { id } = await params;
    const body = await readJsonBody(request);
    const input = validateUpdateNoteInput(body);

    const note = await updateNoteForUser(userId, id, input);
    if (!note) {
      throw new HttpError(404, "Note not found");
    }

    return NextResponse.json(note);
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = getUserIdFromRequest(request);
    if (!userId) {
      throw new HttpError(401, "Unauthorized");
    }

    const { id } = await params;
    const deleted = await deleteNoteForUser(userId, id);
    if (!deleted) {
      throw new HttpError(404, "Note not found");
    }

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return handleRouteError(error);
  }
}
