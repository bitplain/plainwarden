import { NextRequest, NextResponse } from "next/server";
import { getUserIdFromRequest } from "@/lib/server/auth";
import { updateSubtaskForUser } from "@/lib/server/tasks-db";
import {
  HttpError,
  handleRouteError,
  readJsonBody,
  validateUpdateSubtaskInput,
} from "@/lib/server/validators";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const userId = getUserIdFromRequest(request);
    if (!userId) {
      throw new HttpError(401, "Unauthorized");
    }

    const { id } = await context.params;
    if (!id) {
      throw new HttpError(400, "Subtask id is required");
    }

    const body = await readJsonBody(request);
    const input = validateUpdateSubtaskInput(body);
    const subtask = await updateSubtaskForUser(userId, id, input);

    if (!subtask) {
      throw new HttpError(404, "Subtask not found");
    }

    return NextResponse.json(subtask);
  } catch (error) {
    return handleRouteError(error);
  }
}
