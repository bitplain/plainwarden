import { NextRequest, NextResponse } from "next/server";
import { bootstrapAuth, getAuthenticatedUser } from "@/lib/server/auth";
import { restoreNoteVersion } from "@/lib/server/notes-db";
import { HttpError, handleRouteError, readJsonBody } from "@/lib/server/validators";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await bootstrapAuth();

    const user = await getAuthenticatedUser(request);
    if (!user) {
      throw new HttpError(401, "Unauthorized");
    }

    const { id } = await params;
    const body = await readJsonBody(request);
    if (!isRecord(body) || typeof body.versionId !== "string" || !body.versionId) {
      throw new HttpError(400, "versionId is required");
    }

    const note = await restoreNoteVersion(user.id, id, body.versionId);
    if (!note) {
      throw new HttpError(404, "Note or version not found");
    }

    return NextResponse.json(note);
  } catch (error) {
    return handleRouteError(error);
  }
}
