import { NextRequest, NextResponse } from "next/server";
import { getUserIdFromRequest } from "@/lib/server/auth";
import {
  createSubtaskForTask,
  listSubtasksForTask,
} from "@/lib/server/tasks-db";
import {
  HttpError,
  handleRouteError,
  readJsonBody,
  validateCreateSubtaskInput,
} from "@/lib/server/validators";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const userId = getUserIdFromRequest(request);
    if (!userId) {
      throw new HttpError(401, "Unauthorized");
    }

    const { id } = await context.params;
    if (!id) {
      throw new HttpError(400, "Task id is required");
    }

    const subtasks = await listSubtasksForTask(userId, id);
    return NextResponse.json({ subtasks });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: NextRequest, context: RouteContext) {
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
    const input = validateCreateSubtaskInput(body);

    const subtask = await createSubtaskForTask(userId, id, input);
    return NextResponse.json(subtask, { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}
