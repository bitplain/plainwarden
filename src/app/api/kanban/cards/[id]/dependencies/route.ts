import { NextRequest, NextResponse } from "next/server";
import { getUserIdFromRequest } from "@/lib/server/auth";
import { addDependencyForCard, listDependenciesForCard } from "@/lib/server/kanban-db";
import { HttpError, handleRouteError, readJsonBody } from "@/lib/server/validators";
import { validateAddDependencyInput } from "@/lib/server/kanban-validators";

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
    const deps = await listDependenciesForCard(userId, id);
    return NextResponse.json(deps);
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const userId = getUserIdFromRequest(request);
    if (!userId) {
      throw new HttpError(401, "Unauthorized");
    }

    const { id } = await params;
    const body = await readJsonBody(request);
    const input = validateAddDependencyInput(body);
    const dep = await addDependencyForCard(userId, id, input);
    if (!dep) throw new HttpError(404, "Card or dependency target not found");
    return NextResponse.json(dep, { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}
