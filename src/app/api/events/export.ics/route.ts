import { format } from "date-fns";
import { NextRequest } from "next/server";
import { bootstrapAuth, getAuthenticatedUser } from "@/lib/server/auth";
import { parseEventListFilters } from "@/lib/server/event-filters";
import { buildIcsCalendar } from "@/lib/server/ical";
import { listEventsByUser } from "@/lib/server/json-db";
import { HttpError, handleRouteError } from "@/lib/server/validators";

export async function GET(request: NextRequest) {
  try {
    await bootstrapAuth();

    const user = await getAuthenticatedUser(request);
    if (!user) {
      throw new HttpError(401, "Unauthorized");
    }

    const filters = parseEventListFilters(request.nextUrl.searchParams);
    const events = await listEventsByUser(user.id, filters);
    const payload = buildIcsCalendar(events);
    const dateStamp = format(new Date(), "yyyyMMdd");

    return new Response(payload, {
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": `attachment; filename=\"netden-calendar-${dateStamp}.ics\"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
