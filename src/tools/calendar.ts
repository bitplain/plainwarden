import { addDays, format, isValid, parseISO } from "date-fns";
import type { AgentToolDescriptor, ToolExecutionContext, ToolResult } from "@/agent/types";
import type { EventListFilters } from "@/lib/types";
import { createEventForUser, deleteEventForUser, listEventsByUser, updateEventForUser } from "@/lib/server/json-db";

const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

const RELATIVE_DATE_OFFSETS: Record<string, number> = {
  today: 0,
  tomorrow: 1,
  "day after tomorrow": 2,
  "сегодня": 0,
  "завтра": 1,
  "послезавтра": 2,
};

function toStringValue(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed || undefined;
}

function toNumberValue(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}

function normalizeIsoDate(raw: string): string | undefined {
  if (!ISO_DATE_REGEX.test(raw)) {
    return undefined;
  }

  const parsed = parseISO(raw);
  if (!isValid(parsed)) {
    return undefined;
  }

  const normalized = format(parsed, "yyyy-MM-dd");
  return normalized === raw ? normalized : undefined;
}

function normalizeCalendarDateValue(raw: string, nowIso: string): string | undefined {
  const normalizedIso = normalizeIsoDate(raw);
  if (normalizedIso) {
    return normalizedIso;
  }

  const keyword = raw.toLowerCase();
  const offset = RELATIVE_DATE_OFFSETS[keyword];
  if (offset === undefined) {
    return undefined;
  }

  const now = parseISO(nowIso);
  const safeNow = isValid(now) ? now : new Date();
  return format(addDays(safeNow, offset), "yyyy-MM-dd");
}

function buildDateValidationError(fieldName: string): string {
  return `${fieldName} must be YYYY-MM-DD or relative keyword: today/tomorrow/day after tomorrow (сегодня/завтра/послезавтра)`;
}

async function listCalendarEvents(args: Record<string, unknown>, ctx: ToolExecutionContext): Promise<ToolResult> {
  const rawDateFrom = toStringValue(args.dateFrom);
  const rawDateTo = toStringValue(args.dateTo);
  const dateFrom =
    rawDateFrom === undefined ? undefined : normalizeCalendarDateValue(rawDateFrom, ctx.nowIso);
  const dateTo = rawDateTo === undefined ? undefined : normalizeCalendarDateValue(rawDateTo, ctx.nowIso);

  if (rawDateFrom !== undefined && dateFrom === undefined) {
    return {
      ok: false,
      error: buildDateValidationError("dateFrom"),
    };
  }

  if (rawDateTo !== undefined && dateTo === undefined) {
    return {
      ok: false,
      error: buildDateValidationError("dateTo"),
    };
  }

  const filters: EventListFilters = {
    q: toStringValue(args.q),
    type: toStringValue(args.type) as EventListFilters["type"],
    status: toStringValue(args.status) as EventListFilters["status"],
    dateFrom,
    dateTo,
  };

  const limit = Math.min(100, Math.max(1, toNumberValue(args.limit) ?? 30));
  const events = await listEventsByUser(ctx.userId, filters);

  return {
    ok: true,
    data: events.slice(0, limit),
  };
}

async function createCalendarEvent(args: Record<string, unknown>, ctx: ToolExecutionContext): Promise<ToolResult> {
  const title = toStringValue(args.title);
  const rawDate = toStringValue(args.date);

  if (!title || !rawDate) {
    return {
      ok: false,
      error: "title and date are required",
    };
  }

  const date = normalizeCalendarDateValue(rawDate, ctx.nowIso);
  if (!date) {
    return {
      ok: false,
      error: buildDateValidationError("date"),
    };
  }

  const created = await createEventForUser(ctx.userId, {
    title,
    description: toStringValue(args.description) ?? "",
    date,
    time: toStringValue(args.time),
    type: (toStringValue(args.type) as "event" | "task") ?? "task",
    status: (toStringValue(args.status) as "pending" | "done") ?? "pending",
  });

  return {
    ok: true,
    data: created,
  };
}

async function updateCalendarEvent(args: Record<string, unknown>, ctx: ToolExecutionContext): Promise<ToolResult> {
  const eventId = toStringValue(args.eventId);
  if (!eventId) {
    return { ok: false, error: "eventId is required" };
  }

  const rawDate = toStringValue(args.date);
  const date = rawDate === undefined ? undefined : normalizeCalendarDateValue(rawDate, ctx.nowIso);
  if (rawDate !== undefined && date === undefined) {
    return {
      ok: false,
      error: buildDateValidationError("date"),
    };
  }

  const updated = await updateEventForUser(
    ctx.userId,
    eventId,
    {
      title: toStringValue(args.title),
      description: toStringValue(args.description),
      date,
      time: toStringValue(args.time),
      status: toStringValue(args.status) as "pending" | "done" | undefined,
      type: toStringValue(args.type) as "event" | "task" | undefined,
    },
    {
      scope: (toStringValue(args.scope) as "this" | "all" | "this_and_following" | undefined) ?? "this",
      revision: toNumberValue(args.revision),
    },
  );

  if (!updated) {
    return { ok: false, error: "event not found" };
  }

  return {
    ok: true,
    data: updated,
  };
}

async function deleteCalendarEvent(args: Record<string, unknown>, ctx: ToolExecutionContext): Promise<ToolResult> {
  const eventId = toStringValue(args.eventId);
  if (!eventId) {
    return { ok: false, error: "eventId is required" };
  }

  const deleted = await deleteEventForUser(ctx.userId, eventId, {
    scope: (toStringValue(args.scope) as "this" | "all" | "this_and_following" | undefined) ?? "this",
  });

  return {
    ok: deleted,
    data: { deleted },
    error: deleted ? undefined : "event not found",
  };
}

export const calendarTools: AgentToolDescriptor[] = [
  {
    name: "calendar_list_events",
    module: "calendar",
    mutating: false,
    description: "List events/tasks from calendar with optional date and status filters",
    parameters: {
      type: "object",
      properties: {
        q: { type: "string" },
        type: { type: "string", enum: ["event", "task"] },
        status: { type: "string", enum: ["pending", "done"] },
        dateFrom: { type: "string" },
        dateTo: { type: "string" },
        limit: { type: "number" },
      },
    },
    execute: listCalendarEvents,
  },
  {
    name: "calendar_create_event",
    module: "calendar",
    mutating: true,
    description: "Create event/task in calendar",
    parameters: {
      type: "object",
      required: ["title", "date"],
      properties: {
        title: { type: "string" },
        description: { type: "string" },
        date: {
          type: "string",
          description:
            "Date in YYYY-MM-DD, or relative keyword: today/tomorrow/day after tomorrow (сегодня/завтра/послезавтра)",
        },
        time: { type: "string" },
        type: { type: "string", enum: ["event", "task"] },
        status: { type: "string", enum: ["pending", "done"] },
      },
    },
    execute: createCalendarEvent,
  },
  {
    name: "calendar_update_event",
    module: "calendar",
    mutating: true,
    description: "Update existing calendar event/task",
    parameters: {
      type: "object",
      required: ["eventId"],
      properties: {
        eventId: { type: "string" },
        title: { type: "string" },
        description: { type: "string" },
        date: {
          type: "string",
          description:
            "Date in YYYY-MM-DD, or relative keyword: today/tomorrow/day after tomorrow (сегодня/завтра/послезавтра)",
        },
        time: { type: "string" },
        status: { type: "string", enum: ["pending", "done"] },
        type: { type: "string", enum: ["event", "task"] },
        scope: { type: "string", enum: ["this", "all", "this_and_following"] },
        revision: { type: "number" },
      },
    },
    execute: updateCalendarEvent,
  },
  {
    name: "calendar_delete_event",
    module: "calendar",
    mutating: true,
    description: "Delete calendar event/task",
    parameters: {
      type: "object",
      required: ["eventId"],
      properties: {
        eventId: { type: "string" },
        scope: { type: "string", enum: ["this", "all", "this_and_following"] },
      },
    },
    execute: deleteCalendarEvent,
  },
];
