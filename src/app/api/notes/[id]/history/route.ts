import { NextRequest, NextResponse } from "next/server";
import { getUserIdFromRequest } from "@/lib/server/auth";
import { getNoteVersions } from "@/lib/server/notes-db";
import { HttpError, handleRouteError } from "@/lib/server/validators";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = getUserIdFromRequest(request);
    if (!userId) {
      throw new HttpError(401, "Unauthorized");
    }

    const { id } = await params;
    const versions = await getNoteVersions(userId, id);
    return NextResponse.json(versions);
  } catch (error) {
    return handleRouteError(error);
  }
}
