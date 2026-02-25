import type { CalendarEvent, EventStatus, EventType } from "@/lib/types";

export type CalendarView = "month" | "week" | "day";

export type CalendarFilter = "all" | EventType | EventStatus;

export interface SidebarCategory {
  id: CalendarFilter;
  label: string;
  count: number;
  tone: "neutral" | "sky" | "violet" | "amber" | "emerald";
}

export interface UpcomingEvent {
  event: CalendarEvent;
  startsAt: Date;
}
