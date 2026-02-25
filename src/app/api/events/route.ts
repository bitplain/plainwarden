import { NextRequest, NextResponse } from "next/server";
import { bootstrapAuth, getAuthenticatedUser } from "@/lib/server/auth";
import { createEventForUser, listEventsByUser } from "@/lib/server/json-db";
import {
  HttpError,
  handleRouteError,
  readJsonBody,
  validateCreateEventInput,
} from "@/lib/server/validators";

export async function GET(request: NextRequest) {
  try {
    await bootstrapAuth();

    const user = await getAuthenticatedUser(request);
    if (!user) {
      throw new HttpError(401, "Unauthorized");
    }

    const events = await listEventsByUser(user.id);
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

    const body = await readJsonBody(request);
    const input = validateCreateEventInput(body);

    const event = await createEventForUser(user.id, input);
    return NextResponse.json(event, { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}
