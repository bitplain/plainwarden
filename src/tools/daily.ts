import { addDays, format } from "date-fns";
import type { AgentToolDescriptor, DailyItem, ToolExecutionContext, ToolResult } from "@/agent/types";
import { listEventsByUser } from "@/lib/server/json-db";
import prisma from "@/lib/server/prisma";

function toDate(value: unknown, fallback: Date): Date {
  if (typeof value !== "string") return fallback;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? fallback : parsed;
}

function toIsoDate(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

async function dailyOverview(args: Record<string, unknown>, ctx: ToolExecutionContext): Promise<ToolResult> {
  const start = toDate(args.startDate, new Date(ctx.nowIso));
  const days = typeof args.days === "number" && Number.isFinite(args.days) ? args.days : 7;
  const safeDays = Math.min(31, Math.max(1, Math.floor(days)));
  const end = addDays(start, safeDays);

  const dateFrom = toIsoDate(start);
  const dateTo = toIsoDate(end);

  const tasks = await listEventsByUser(ctx.userId, {
    type: "task",
    dateFrom,
    dateTo,
  });

  const dueCards = await prisma.kanbanCard.findMany({
    where: {
      userId: ctx.userId,
      dueDate: {
        gte: dateFrom,
        lte: dateTo,
      },
    },
    include: { eventLinks: true },
    orderBy: [{ dueDate: "asc" }, { updatedAt: "desc" }],
  });

  const dailyItems: DailyItem[] = [
    ...tasks.map((task) => ({
      id: `daily-event-${task.id}`,
      title: task.title,
      date: task.date,
      source: "calendar" as const,
      status: task.status ?? "pending",
      linkedEventId: task.id,
    })),
    ...dueCards.map((card) => ({
      id: `daily-card-${card.id}`,
      title: card.title,
      date: card.dueDate ?? dateFrom,
      source: "kanban" as const,
      status: "pending" as const,
      linkedEventId: card.eventLinks[0]?.eventId,
    })),
  ].sort((a, b) => a.date.localeCompare(b.date));

  return {
    ok: true,
    data: {
      dateFrom,
      dateTo,
      items: dailyItems,
      stats: {
        total: dailyItems.length,
        done: dailyItems.filter((item) => item.status === "done").length,
        pending: dailyItems.filter((item) => item.status !== "done").length,
      },
    },
  };
}

export const dailyTools: AgentToolDescriptor[] = [
  {
    name: "daily_overview",
    module: "daily",
    mutating: false,
    description: "Get daily planner overview for tasks and deadlines",
    parameters: {
      type: "object",
      properties: {
        startDate: { type: "string" },
        days: { type: "number" },
      },
    },
    execute: dailyOverview,
  },
];
