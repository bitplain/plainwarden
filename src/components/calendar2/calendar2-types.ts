import type { CalendarEvent } from "@/lib/types";

export type Calendar2View = "month" | "week" | "day";
export type Calendar2Tab = "calendar" | "planner" | "kanban" | "notes";

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

export interface TimeBlock {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  title: string;
  description: string;
  isRecurring: boolean;
  recurringDays?: number[];
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
  { label: string; color: string; border: string; bg: string }
> = {
  urgent: {
    label: "Срочно",
    color: "text-[#d6dbff]",
    border: "border-[rgba(94,106,210,0.44)]",
    bg: "bg-[rgba(94,106,210,0.22)]",
  },
  high: {
    label: "Высокий",
    color: "text-[var(--cal2-text-primary)]",
    border: "border-[rgba(255,255,255,0.14)]",
    bg: "bg-[rgba(255,255,255,0.07)]",
  },
  medium: {
    label: "Средний",
    color: "text-[#c2c2c2]",
    border: "border-[rgba(255,255,255,0.1)]",
    bg: "bg-[rgba(255,255,255,0.05)]",
  },
  low: {
    label: "Низкий",
    color: "text-[var(--cal2-text-secondary)]",
    border: "border-[rgba(255,255,255,0.08)]",
    bg: "bg-[rgba(255,255,255,0.04)]",
  },
};

export const WEEKDAY_LABELS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];
