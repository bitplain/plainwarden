import { NextRequest, NextResponse } from "next/server";
import { bootstrapAuth, getAuthenticatedUser } from "@/lib/server/auth";
import { deleteEventForUser, updateEventForUser } from "@/lib/server/json-db";
import type { RecurrenceScope } from "@/lib/types";
import {
  HttpError,
  handleRouteError,
  readJsonBody,
  validateUpdateEventInput,
} from "@/lib/server/validators";
import { getRateLimitResponse } from "@/lib/server/rate-limit";

const MUTATE_EVENT_RATE_LIMIT = {
  maxRequests: 60,
  windowMs: 60 * 1000,
};

interface RouteContext {
  params: Promise<{ id: string }>;
}

function readRecurrenceScope(value: string | null): RecurrenceScope {
  if (!value || value === "this") {
    return "this";
  }
  if (value === "all" || value === "this_and_following") {
    return value;
  }
  throw new HttpError(400, "scope must be one of 'this', 'all', 'this_and_following'");
}

async function updateEvent(request: NextRequest, context: RouteContext) {
  try {
    await bootstrapAuth();

    const user = await getAuthenticatedUser(request);
    if (!user) {
      throw new HttpError(401, "Unauthorized");
    }

    const rateLimitResponse = getRateLimitResponse(request, "events:mutate", MUTATE_EVENT_RATE_LIMIT);
    if (rateLimitResponse) return rateLimitResponse;

    const { id } = await context.params;
    if (!id) {
      throw new HttpError(400, "Event id is required");
    }

    const body = await readJsonBody(request);
    const input = validateUpdateEventInput(body);
    const { recurrenceScope, ...updatePayload } = input;
    const scope = recurrenceScope ?? "this";

    if (scope !== "this" && updatePayload.date !== undefined) {
      throw new HttpError(400, "date can only be changed with recurrenceScope='this'");
    }

    const updated = await updateEventForUser(user.id, id, updatePayload, {
      scope,
    });
    if (!updated) {
      throw new HttpError(404, "Event not found");
    }

    return NextResponse.json(updated);
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  return updateEvent(request, context);
}

export async function PUT(request: NextRequest, context: RouteContext) {
  // Backward-compatible alias for legacy clients.
  return updateEvent(request, context);
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    await bootstrapAuth();

    const user = await getAuthenticatedUser(request);
    if (!user) {
      throw new HttpError(401, "Unauthorized");
    }

    const rateLimitResponse = getRateLimitResponse(request, "events:mutate", MUTATE_EVENT_RATE_LIMIT);
    if (rateLimitResponse) return rateLimitResponse;

    const { id } = await context.params;
    if (!id) {
      throw new HttpError(400, "Event id is required");
    }

    const scope = readRecurrenceScope(request.nextUrl.searchParams.get("scope"));
    const deleted = await deleteEventForUser(user.id, id, { scope });
    if (!deleted) {
      throw new HttpError(404, "Event not found");
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleRouteError(error);
  }
}
