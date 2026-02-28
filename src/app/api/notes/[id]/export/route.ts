import { NextRequest, NextResponse } from "next/server";
import { bootstrapAuth, getAuthenticatedUser } from "@/lib/server/auth";
import { exportNoteAsMarkdown } from "@/lib/server/notes-db";
import { HttpError, handleRouteError } from "@/lib/server/validators";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await bootstrapAuth();

    const user = await getAuthenticatedUser(request);
    if (!user) {
      throw new HttpError(401, "Unauthorized");
    }

    const { id } = await params;
    const markdown = await exportNoteAsMarkdown(user.id, id);
    if (markdown === null) {
      throw new HttpError(404, "Note not found");
    }

    return new NextResponse(markdown, {
      status: 200,
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        "Content-Disposition": `attachment; filename="note-${id}.md"`,
      },
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
