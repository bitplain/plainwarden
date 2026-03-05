import { NextRequest, NextResponse } from "next/server";
import { getUserIdFromRequest } from "@/lib/server/auth";
import { updateTaskForUser } from "@/lib/server/tasks-db";
import {
  HttpError,
  handleRouteError,
  readJsonBody,
  validateUpdateTaskInput,
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
      throw new HttpError(400, "Task id is required");
    }

    const body = await readJsonBody(request);
    const input = validateUpdateTaskInput(body);

    const task = await updateTaskForUser(userId, id, input);
    if (!task) {
      throw new HttpError(404, "Task not found");
    }

    return NextResponse.json(task);
  } catch (error) {
    return handleRouteError(error);
  }
}
