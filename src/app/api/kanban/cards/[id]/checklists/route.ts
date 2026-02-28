import { NextRequest, NextResponse } from "next/server";
import { bootstrapAuth, getAuthenticatedUser } from "@/lib/server/auth";
import { createChecklistForCard, listChecklistsForCard } from "@/lib/server/kanban-db";
import { HttpError, handleRouteError, readJsonBody } from "@/lib/server/validators";
import { validateCreateChecklistInput } from "@/lib/server/kanban-validators";

interface Params {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: Params) {
  try {
    await bootstrapAuth();
    const user = await getAuthenticatedUser(request);
    if (!user) throw new HttpError(401, "Unauthorized");

    const { id } = await params;
    const checklists = await listChecklistsForCard(user.id, id);
    return NextResponse.json(checklists);
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: NextRequest, { params }: Params) {
  try {
    await bootstrapAuth();
    const user = await getAuthenticatedUser(request);
    if (!user) throw new HttpError(401, "Unauthorized");

    const { id } = await params;
    const body = await readJsonBody(request);
    const input = validateCreateChecklistInput(body);
    const checklist = await createChecklistForCard(user.id, id, input);
    if (!checklist) throw new HttpError(404, "Card not found");
    return NextResponse.json(checklist, { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}
