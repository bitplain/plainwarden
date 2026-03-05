import type { CalendarEvent } from "@/lib/types";

export type Calendar2View = "month" | "week" | "day";
export type Calendar2Tab = "inbox" | "calendar" | "kanban" | "notes" | "ai";

export type TaskPriority = "urgent" | "high" | "medium" | "low";

export type KanbanColumn = "backlog" | "in_progress" | "review" | "done";
export type KanbanCardSource = "manual" | "event_sync";

export interface KanbanCard {
  id: string;
  title: string;
  description: string;
  column: KanbanColumn;
  priority: TaskPriority;
  linkedEventId?: string;
  source?: KanbanCardSource;
  createdAt: string;
}

export interface Note {
  id: string;
  title: string;
  content: string;
  linkedDate?: string;
  linkedEventId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CalendarCategory {
  id: string;
  label: string;
  color: string;
  createdAt: string;
}

export type NotificationKind = "reminder" | "overdue" | "info";

export interface AppNotification {
  id: string;
  kind: NotificationKind;
  title: string;
  body: string;
  eventId?: string;
  read: boolean;
  createdAt: string;
}

export type AuditAction = "create" | "update" | "delete" | "convert";

export interface AuditEntry {
  id: string;
  action: AuditAction;
  eventId: string;
  eventTitle: string;
  detail?: string;
  timestamp: string;
}

export interface SidebarCategory {
  id: string;
  label: string;
  count: number;
  tone: "neutral" | "sky" | "violet" | "amber" | "emerald" | "rose" | "indigo";
}

export interface UpcomingEvent {
  event: CalendarEvent;
  startsAt: Date;
}

export const KANBAN_COLUMNS: { id: KanbanColumn; label: string }[] = [
  { id: "backlog", label: "Backlog" },
  { id: "in_progress", label: "В работе" },
  { id: "review", label: "На проверке" },
  { id: "done", label: "Готово" },
];

export const PRIORITY_CONFIG: Record<
  TaskPriority,
  { label: string; dot: string }
> = {
  urgent: {
    label: "Срочно",
    dot: "bg-[#EF4444]",
  },
  high: {
    label: "Высокий",
    dot: "bg-[#F59E0B]",
  },
  medium: {
    label: "Средний",
    dot: "bg-[#6366F1]",
  },
  low: {
    label: "Низкий",
    dot: "bg-[#6B7280]",
  },
};

export const WEEKDAY_LABELS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];
