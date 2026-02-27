import { addDays, addMonths, addWeeks, format, parseISO, subDays } from "date-fns";
import type { EventRecurrence } from "@/lib/types";

const MAX_RECURRENCE_OCCURRENCES = 400;

function isValidDateValue(value: Date): boolean {
  return !Number.isNaN(value.getTime());
}

export function generateRecurrenceDates(startDate: string, recurrence: EventRecurrence): string[] {
  const start = parseISO(startDate);
  if (!isValidDateValue(start)) {
    throw new Error("Invalid recurrence start date");
  }

  const until = recurrence.until ? parseISO(recurrence.until) : null;
  if (until && !isValidDateValue(until)) {
    throw new Error("Invalid recurrence until date");
  }

  const occurrences: string[] = [];
  let cursor = start;

  while (occurrences.length < MAX_RECURRENCE_OCCURRENCES) {
    const dateKey = format(cursor, "yyyy-MM-dd");
    if (until && cursor > until) {
      break;
    }

    occurrences.push(dateKey);

    if (recurrence.count && occurrences.length >= recurrence.count) {
      break;
    }

    if (recurrence.frequency === "daily") {
      cursor = addDays(cursor, recurrence.interval);
    } else if (recurrence.frequency === "weekly") {
      cursor = addWeeks(cursor, recurrence.interval);
    } else {
      cursor = addMonths(cursor, recurrence.interval);
    }
  }

  return occurrences;
}

export function dayBeforeDate(dateKey: string): string {
  const date = parseISO(dateKey);
  if (!isValidDateValue(date)) {
    throw new Error("Invalid date");
  }
  return format(subDays(date, 1), "yyyy-MM-dd");
}
