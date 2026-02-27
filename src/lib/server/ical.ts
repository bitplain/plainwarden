import { addDays, addHours, format, parseISO } from "date-fns";
import type { CalendarEvent } from "@/lib/types";

function escapeIcsText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\r?\n/g, "\\n")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,");
}

function toUtcDateTimeStamp(value: Date): string {
  return value.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

function buildDateRangeLines(event: CalendarEvent): string[] {
  if (!event.time) {
    const startDate = parseISO(event.date);
    const endDate = addDays(startDate, 1);
    return [
      `DTSTART;VALUE=DATE:${format(startDate, "yyyyMMdd")}`,
      `DTEND;VALUE=DATE:${format(endDate, "yyyyMMdd")}`,
    ];
  }

  const startAt = parseISO(`${event.date}T${event.time}:00`);
  const endAt = addHours(startAt, 1);

  return [
    `DTSTART:${format(startAt, "yyyyMMdd'T'HHmmss")}`,
    `DTEND:${format(endAt, "yyyyMMdd'T'HHmmss")}`,
  ];
}

export function buildIcsCalendar(
  events: CalendarEvent[],
  options: {
    now?: Date;
    calendarName?: string;
  } = {},
): string {
  const dtStamp = toUtcDateTimeStamp(options.now ?? new Date());
  const calendarName = escapeIcsText(options.calendarName ?? "NetDen Calendar");

  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//PlainWarden//Calendar2//RU",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${calendarName}`,
  ];

  for (const event of events) {
    lines.push("BEGIN:VEVENT");
    lines.push(`UID:${event.id}@plainwarden.local`);
    lines.push(`DTSTAMP:${dtStamp}`);
    lines.push(...buildDateRangeLines(event));
    lines.push(`SUMMARY:${escapeIcsText(event.title)}`);

    if (event.description) {
      lines.push(`DESCRIPTION:${escapeIcsText(event.description)}`);
    }

    lines.push(`CATEGORIES:${event.type === "task" ? "TASK" : "EVENT"}`);
    lines.push("END:VEVENT");
  }

  lines.push("END:VCALENDAR");
  return `${lines.join("\r\n")}\r\n`;
}
