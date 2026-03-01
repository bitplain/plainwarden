import { NextRequest, NextResponse } from "next/server";
import { getUserIdFromRequest } from "@/lib/server/auth";
import { removeDependencyForCard } from "@/lib/server/kanban-db";
import { HttpError, handleRouteError } from "@/lib/server/validators";

interface Params {
  params: Promise<{ id: string; depId: string }>;
}

export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const userId = getUserIdFromRequest(request);
    if (!userId) {
      throw new HttpError(401, "Unauthorized");
    }

    const { depId } = await params;
    const deleted = await removeDependencyForCard(userId, depId);
    if (!deleted) throw new HttpError(404, "Dependency not found");
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return handleRouteError(error);
  }
}
