import { NextRequest, NextResponse } from "next/server";
import { getUserIdFromRequest } from "@/lib/server/auth";
import {
  createTaskForUser,
  listTasksForUser,
} from "@/lib/server/tasks-db";
import { getRateLimitResponse } from "@/lib/server/rate-limit";
import {
  HttpError,
  handleRouteError,
  readJsonBody,
  validateCreateTaskInput,
} from "@/lib/server/validators";

const CREATE_TASK_RATE_LIMIT = {
  maxRequests: 120,
  windowMs: 60 * 1000,
};

export async function GET(request: NextRequest) {
  try {
    const userId = getUserIdFromRequest(request);
    if (!userId) {
      throw new HttpError(401, "Unauthorized");
    }

    const params = request.nextUrl.searchParams;
    const tasks = await listTasksForUser(userId, {
      q: params.get("q") ?? undefined,
      status: (params.get("status") as "todo" | "in_progress" | "blocked" | "done" | null) ?? undefined,
      dueDate: params.get("dueDate") ?? undefined,
      dateFrom: params.get("dateFrom") ?? undefined,
      dateTo: params.get("dateTo") ?? undefined,
    });

    return NextResponse.json({ tasks });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = getUserIdFromRequest(request);
    if (!userId) {
      throw new HttpError(401, "Unauthorized");
    }

    const rateLimitResponse = await getRateLimitResponse(
      request,
      "tasks:create",
      CREATE_TASK_RATE_LIMIT,
    );
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    const body = await readJsonBody(request);
    const input = validateCreateTaskInput(body);
    const task = await createTaskForUser(userId, input);

    return NextResponse.json(task, { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}
