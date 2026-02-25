import {
  addDays,
  addMonths,
  addWeeks,
  compareAsc,
  endOfMonth,
  endOfWeek,
  format,
  parseISO,
  setHours,
  setMinutes,
  startOfDay,
  startOfMonth,
  startOfWeek,
  subDays,
  subMonths,
  subWeeks,
} from "date-fns";
import { ru } from "date-fns/locale";
import type { CalendarEvent } from "@/lib/types";
import type { CalendarView } from "@/components/calendar/calendar-types";

export const WEEK_STARTS_ON = 1 as const;
export const DAY_VIEW_START_HOUR = 8;
export const DAY_VIEW_END_HOUR = 21;

function uppercaseFirst(value: string): string {
  if (!value) {
    return value;
  }
  return value[0].toUpperCase() + value.slice(1);
}

export function toDateKey(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

export function parseEventDateTime(event: CalendarEvent): Date {
  const source = event.time ? `${event.date}T${event.time}` : `${event.date}T00:00`;
  const parsed = parseISO(source);

  if (Number.isNaN(parsed.getTime())) {
    return parseISO(`${event.date}T00:00`);
  }

  return parsed;
}

export function sortEventsByDateTime(events: CalendarEvent[]): CalendarEvent[] {
  return [...events].sort((a, b) => {
    const dateDelta = compareAsc(parseEventDateTime(a), parseEventDateTime(b));
    if (dateDelta !== 0) {
      return dateDelta;
    }
    return a.title.localeCompare(b.title, "ru");
  });
}

export function buildEventsByDate(events: CalendarEvent[]): Record<string, CalendarEvent[]> {
  const map: Record<string, CalendarEvent[]> = {};

  for (const event of sortEventsByDateTime(events)) {
    const key = event.date;
    if (!map[key]) {
      map[key] = [];
    }
    map[key].push(event);
  }

  return map;
}

export function getMonthGridDates(anchorDate: Date): Date[] {
  const monthStart = startOfMonth(anchorDate);
  const monthEnd = endOfMonth(anchorDate);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: WEEK_STARTS_ON });
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: WEEK_STARTS_ON });
  const days: Date[] = [];

  let cursor = gridStart;
  while (cursor <= gridEnd) {
    days.push(cursor);
    cursor = addDays(cursor, 1);
  }

  return days;
}

export function getWeekDates(anchorDate: Date): Date[] {
  const weekStart = startOfWeek(anchorDate, { weekStartsOn: WEEK_STARTS_ON });
  const weekEnd = endOfWeek(anchorDate, { weekStartsOn: WEEK_STARTS_ON });
  const days: Date[] = [];

  let cursor = weekStart;
  while (cursor <= weekEnd) {
    days.push(cursor);
    cursor = addDays(cursor, 1);
  }

  return days;
}

export function getDaySlots(anchorDate: Date): Date[] {
  const dayStart = startOfDay(anchorDate);
  const slots: Date[] = [];

  for (let hour = DAY_VIEW_START_HOUR; hour <= DAY_VIEW_END_HOUR; hour += 1) {
    slots.push(setMinutes(setHours(dayStart, hour), 0));
  }

  return slots;
}

export function shiftAnchorDate(anchorDate: Date, view: CalendarView, direction: "prev" | "next"): Date {
  if (view === "month") {
    return direction === "prev" ? subMonths(anchorDate, 1) : addMonths(anchorDate, 1);
  }

  if (view === "week") {
    return direction === "prev" ? subWeeks(anchorDate, 1) : addWeeks(anchorDate, 1);
  }

  return direction === "prev" ? subDays(anchorDate, 1) : addDays(anchorDate, 1);
}

export function formatPeriodLabel(anchorDate: Date, view: CalendarView): string {
  if (view === "month") {
    return uppercaseFirst(format(anchorDate, "LLLL yyyy", { locale: ru }));
  }

  if (view === "week") {
    const weekStart = startOfWeek(anchorDate, { weekStartsOn: WEEK_STARTS_ON });
    const weekEnd = endOfWeek(anchorDate, { weekStartsOn: WEEK_STARTS_ON });

    return `${format(weekStart, "d MMM", { locale: ru })} — ${format(weekEnd, "d MMM yyyy", { locale: ru })}`;
  }

  return uppercaseFirst(format(anchorDate, "EEEE, d MMMM yyyy", { locale: ru }));
}

export function formatDayShort(date: Date): string {
  return uppercaseFirst(format(date, "EEE", { locale: ru }));
}

export function formatMonthShort(date: Date): string {
  return uppercaseFirst(format(date, "LLL", { locale: ru }));
}

export function normalizeToDay(date: Date): Date {
  return startOfDay(date);
}
