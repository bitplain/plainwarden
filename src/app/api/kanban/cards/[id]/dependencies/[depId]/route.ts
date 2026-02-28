import { NextRequest, NextResponse } from "next/server";
import { bootstrapAuth, getAuthenticatedUser } from "@/lib/server/auth";
import { removeDependencyForCard } from "@/lib/server/kanban-db";
import { HttpError, handleRouteError } from "@/lib/server/validators";

interface Params {
  params: Promise<{ id: string; depId: string }>;
}

export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    await bootstrapAuth();
    const user = await getAuthenticatedUser(request);
    if (!user) throw new HttpError(401, "Unauthorized");

    const { depId } = await params;
    const deleted = await removeDependencyForCard(user.id, depId);
    if (!deleted) throw new HttpError(404, "Dependency not found");
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return handleRouteError(error);
  }
}
