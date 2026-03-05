import { NextRequest, NextResponse } from "next/server";
import { getUserIdFromRequest } from "@/lib/server/auth";
import { archiveInboxItemForUser } from "@/lib/server/inbox-db";
import {
  HttpError,
  handleRouteError,
} from "@/lib/server/validators";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const userId = getUserIdFromRequest(request);
    if (!userId) {
      throw new HttpError(401, "Unauthorized");
    }

    const { id } = await context.params;
    if (!id) {
      throw new HttpError(400, "Inbox item id is required");
    }

    const item = await archiveInboxItemForUser(userId, id);
    if (!item) {
      throw new HttpError(404, "Inbox item not found");
    }

    return NextResponse.json(item);
  } catch (error) {
    return handleRouteError(error);
  }
}
