import { NextRequest, NextResponse } from "next/server";
import { bootstrapAuth, getAuthenticatedUser } from "@/lib/server/auth";
import { deleteCardForUser, getCardForUser, updateCardForUser } from "@/lib/server/kanban-db";
import { HttpError, handleRouteError, readJsonBody } from "@/lib/server/validators";
import { validateUpdateCardInput } from "@/lib/server/kanban-validators";

interface Params {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: Params) {
  try {
    await bootstrapAuth();
    const user = await getAuthenticatedUser(request);
    if (!user) throw new HttpError(401, "Unauthorized");

    const { id } = await params;
    const card = await getCardForUser(user.id, id);
    if (!card) throw new HttpError(404, "Card not found");
    return NextResponse.json(card);
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    await bootstrapAuth();
    const user = await getAuthenticatedUser(request);
    if (!user) throw new HttpError(401, "Unauthorized");

    const { id } = await params;
    const body = await readJsonBody(request);
    const input = validateUpdateCardInput(body);
    const card = await updateCardForUser(user.id, id, input);
    if (!card) throw new HttpError(404, "Card not found");
    return NextResponse.json(card);
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
    const deleted = await deleteCardForUser(user.id, id);
    if (!deleted) throw new HttpError(404, "Card not found");
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return handleRouteError(error);
  }
}
