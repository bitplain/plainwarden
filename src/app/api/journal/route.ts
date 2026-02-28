import { NextRequest, NextResponse } from "next/server";
import { bootstrapAuth, getAuthenticatedUser } from "@/lib/server/auth";
import {
  createJournalEntryForUser,
  listJournalEntriesForUser,
} from "@/lib/server/journal-db";
import type { JournalListFilters } from "@/lib/server/journal-db";
import { HttpError, handleRouteError, readJsonBody } from "@/lib/server/validators";
import { getRateLimitResponse } from "@/lib/server/rate-limit";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function sanitizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item: unknown): item is string => typeof item === "string")
    .map((item: string) => item.trim())
    .filter(Boolean);
}

const CREATE_JOURNAL_RATE_LIMIT = {
  maxRequests: 120,
  windowMs: 60 * 1000,
};

export async function GET(request: NextRequest) {
  try {
    await bootstrapAuth();

    const user = await getAuthenticatedUser(request);
    if (!user) {
      throw new HttpError(401, "Unauthorized");
    }

    const params = request.nextUrl.searchParams;
    const filters: JournalListFilters = {};
    const date = params.get("date");
    if (date) filters.date = date;
    const dateFrom = params.get("dateFrom");
    if (dateFrom) filters.dateFrom = dateFrom;
    const dateTo = params.get("dateTo");
    if (dateTo) filters.dateTo = dateTo;
    const q = params.get("q");
    if (q) filters.q = q;
    const tag = params.get("tag");
    if (tag) filters.tag = tag;

    const entries = await listJournalEntriesForUser(user.id, filters);
    return NextResponse.json(entries);
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

    const rateLimitResponse = getRateLimitResponse(request, "journal:create", CREATE_JOURNAL_RATE_LIMIT);
    if (rateLimitResponse) return rateLimitResponse;

    const body = await readJsonBody(request);
    if (!isRecord(body)) {
      throw new HttpError(400, "Invalid payload");
    }

    const title = typeof body.title === "string" ? body.title.trim() : "";
    const date = typeof body.date === "string" ? body.date.trim() : "";

    if (!title) {
      throw new HttpError(400, "title is required");
    }
    if (!date) {
      throw new HttpError(400, "date is required");
    }

    const entry = await createJournalEntryForUser(user.id, {
      title,
      body: typeof body.body === "string" ? body.body : "",
      date,
      mood: typeof body.mood === "string" ? body.mood.trim() || undefined : undefined,
      tags: sanitizeStringArray(body.tags),
    });

    return NextResponse.json(entry, { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}
