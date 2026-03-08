import { NextRequest, NextResponse } from "next/server";
import { getUserIdFromRequest } from "@/lib/server/auth";
import { analyzeInboxItemForUser } from "@/lib/server/inbox-ai";
import { getRateLimitResponse } from "@/lib/server/rate-limit";
import { HttpError, handleRouteError, readJsonBody } from "@/lib/server/validators";

const INBOX_AI_RATE_LIMIT = {
  maxRequests: 45,
  windowMs: 60 * 1000,
};

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const userId = getUserIdFromRequest(request);
    if (!userId) {
      throw new HttpError(401, "Unauthorized");
    }

    const rateLimitResponse = await getRateLimitResponse(
      request,
      "inbox:ai",
      INBOX_AI_RATE_LIMIT,
    );
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    const { id } = await context.params;
    if (!id) {
      throw new HttpError(400, "Inbox item id is required");
    }

    await readJsonBody(request);
    const timezone = request.headers.get("x-netden-timezone")?.trim() || "UTC";

    const result = await analyzeInboxItemForUser(userId, id, timezone);
    if (!result) {
      throw new HttpError(404, "Inbox item not found");
    }

    return NextResponse.json(result);
  } catch (error) {
    return handleRouteError(error);
  }
}
