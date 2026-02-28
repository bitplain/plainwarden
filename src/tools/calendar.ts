import type { AgentToolDescriptor, ToolExecutionContext, ToolResult } from "@/agent/types";
import type { EventListFilters } from "@/lib/types";
import { createEventForUser, deleteEventForUser, listEventsByUser, updateEventForUser } from "@/lib/server/json-db";

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

async function listCalendarEvents(args: Record<string, unknown>, ctx: ToolExecutionContext): Promise<ToolResult> {
  const filters: EventListFilters = {
    q: toStringValue(args.q),
    type: toStringValue(args.type) as EventListFilters["type"],
    status: toStringValue(args.status) as EventListFilters["status"],
    dateFrom: toStringValue(args.dateFrom),
    dateTo: toStringValue(args.dateTo),
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
  const date = toStringValue(args.date);

  if (!title || !date) {
    return {
      ok: false,
      error: "title and date are required",
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

  const updated = await updateEventForUser(
    ctx.userId,
    eventId,
    {
      title: toStringValue(args.title),
      description: toStringValue(args.description),
      date: toStringValue(args.date),
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
        date: { type: "string" },
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
        date: { type: "string" },
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
