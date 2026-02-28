import { NextRequest, NextResponse } from "next/server";
import { bootstrapAuth, getAuthenticatedUser } from "@/lib/server/auth";
import { createNoteForUser, listNotesForUser } from "@/lib/server/notes-db";
import { HttpError, handleRouteError, readJsonBody, validateCreateNoteInput } from "@/lib/server/validators";
import { getRateLimitResponse } from "@/lib/server/rate-limit";
import { NoteListFilters } from "@/lib/types";

const CREATE_NOTE_RATE_LIMIT = {
  maxRequests: 120,
  windowMs: 60 * 1000,
};

export async function GET(request: NextRequest) {
  try {
    await bootstrapAuth();

    const user = await getAuthenticatedUser(request);
    if (!user) {
      throw new HttpError(401, "Unauthorized");
    }

    const params = request.nextUrl.searchParams;
    const filters: NoteListFilters = {};
    const q = params.get("q");
    if (q) filters.q = q;
    const tag = params.get("tag");
    if (tag) filters.tag = tag;
    const parentId = params.get("parentId");
    if (parentId !== null) filters.parentId = parentId;

    const notes = await listNotesForUser(user.id, filters);
    return NextResponse.json(notes);
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    await bootstrapAuth();

    const user = await getAuthenticatedUser(request);
    if (!user) {
      throw new HttpError(401, "Unauthorized");
    }

    const rateLimitResponse = getRateLimitResponse(request, "notes:create", CREATE_NOTE_RATE_LIMIT);
    if (rateLimitResponse) return rateLimitResponse;

    const body = await readJsonBody(request);
    const input = validateCreateNoteInput(body);

    const note = await createNoteForUser(user.id, input);
    return NextResponse.json(note, { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}
