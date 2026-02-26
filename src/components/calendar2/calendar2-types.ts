import type { CalendarEvent } from "@/lib/types";

export type Calendar2View = "month" | "week" | "day";
export type Calendar2Tab = "calendar" | "planner" | "kanban" | "notes";

export type TaskPriority = "urgent" | "high" | "medium" | "low";

export type KanbanColumn = "backlog" | "in_progress" | "review" | "done";

export interface KanbanCard {
  id: string;
  title: string;
  description: string;
  column: KanbanColumn;
  priority: TaskPriority;
  linkedEventId?: string;
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

export const PRIORITY_CONFIG: Record<TaskPriority, { label: string; color: string; border: string; bg: string }> = {
  urgent: { label: "Срочно", color: "text-red-300", border: "border-red-400/30", bg: "bg-red-500/12" },
  high: { label: "Высокий", color: "text-orange-300", border: "border-orange-400/30", bg: "bg-orange-500/12" },
  medium: { label: "Средний", color: "text-yellow-300", border: "border-yellow-400/30", bg: "bg-yellow-500/12" },
  low: { label: "Низкий", color: "text-emerald-300", border: "border-emerald-400/30", bg: "bg-emerald-500/12" },
};

export const WEEKDAY_LABELS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];
