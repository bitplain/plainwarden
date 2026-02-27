import { NextRequest, NextResponse } from "next/server";
import { bootstrapAuth, getAuthenticatedUser } from "@/lib/server/auth";
import { createEventForUser, listEventsByUser } from "@/lib/server/json-db";
import { parseEventListFilters } from "@/lib/server/event-filters";
import {
  HttpError,
  handleRouteError,
  readJsonBody,
  validateCreateEventInput,
} from "@/lib/server/validators";
import { getRateLimitResponse } from "@/lib/server/rate-limit";

const CREATE_EVENT_RATE_LIMIT = {
  maxRequests: 60,
  windowMs: 60 * 1000,
};

export async function GET(request: NextRequest) {
  try {
    await bootstrapAuth();

    const user = await getAuthenticatedUser(request);
    if (!user) {
      throw new HttpError(401, "Unauthorized");
    }

    const filters = parseEventListFilters(request.nextUrl.searchParams);
    const events = await listEventsByUser(user.id, filters);
    return NextResponse.json(events);
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

    const rateLimitResponse = getRateLimitResponse(request, "events:create", CREATE_EVENT_RATE_LIMIT);
    if (rateLimitResponse) return rateLimitResponse;

    const body = await readJsonBody(request);
    const input = validateCreateEventInput(body);

    const event = await createEventForUser(user.id, input);
    return NextResponse.json(event, { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}
