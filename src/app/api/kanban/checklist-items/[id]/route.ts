import { NextRequest, NextResponse } from "next/server";
import { getUserIdFromRequest } from "@/lib/server/auth";
import { deleteChecklistItem, updateChecklistItem } from "@/lib/server/kanban-db";
import { HttpError, handleRouteError, readJsonBody } from "@/lib/server/validators";
import { validateUpdateChecklistItemInput } from "@/lib/server/kanban-validators";

interface Params {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const userId = getUserIdFromRequest(request);
    if (!userId) {
      throw new HttpError(401, "Unauthorized");
    }

    const { id } = await params;
    const body = await readJsonBody(request);
    const input = validateUpdateChecklistItemInput(body);
    const item = await updateChecklistItem(userId, id, input);
    if (!item) throw new HttpError(404, "Checklist item not found");
    return NextResponse.json(item);
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
    const deleted = await deleteChecklistItem(userId, id);
    if (!deleted) throw new HttpError(404, "Checklist item not found");
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return handleRouteError(error);
  }
}
