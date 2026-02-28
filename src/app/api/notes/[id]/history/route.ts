import { NextRequest, NextResponse } from "next/server";
import { bootstrapAuth, getAuthenticatedUser } from "@/lib/server/auth";
import { getNoteVersions } from "@/lib/server/notes-db";
import { HttpError, handleRouteError } from "@/lib/server/validators";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await bootstrapAuth();

    const user = await getAuthenticatedUser(request);
    if (!user) {
      throw new HttpError(401, "Unauthorized");
    }

    const { id } = await params;
    const versions = await getNoteVersions(user.id, id);
    return NextResponse.json(versions);
  } catch (error) {
    return handleRouteError(error);
  }
}
