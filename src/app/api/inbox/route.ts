import { NextRequest, NextResponse } from "next/server";
import { getUserIdFromRequest } from "@/lib/server/auth";
import {
  createInboxItemForUser,
  listInboxItemsForUser,
} from "@/lib/server/inbox-db";
import { getRateLimitResponse } from "@/lib/server/rate-limit";
import {
  HttpError,
  handleRouteError,
  parseInboxStatusParam,
  readJsonBody,
  validateCreateInboxItemInput,
} from "@/lib/server/validators";

const CREATE_INBOX_ITEM_RATE_LIMIT = {
  maxRequests: 120,
  windowMs: 60 * 1000,
};

export async function GET(request: NextRequest) {
  try {
    const userId = getUserIdFromRequest(request);
    if (!userId) {
      throw new HttpError(401, "Unauthorized");
    }

    const status = parseInboxStatusParam(request.nextUrl.searchParams.get("status"));
    const items = await listInboxItemsForUser(userId, status);

    return NextResponse.json({ items });
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
      "inbox:create",
      CREATE_INBOX_ITEM_RATE_LIMIT,
    );
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    const body = await readJsonBody(request);
    const input = validateCreateInboxItemInput(body);

    const item = await createInboxItemForUser({
      userId,
      content: input.content,
      typeHint: input.typeHint,
    });

    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}
