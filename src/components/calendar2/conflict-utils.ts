import type { CalendarEvent } from "@/lib/types";

interface ConflictCandidate {
  date: string;
  time?: string;
  excludeEventId?: string;
}

export function findTimeConflicts(
  events: CalendarEvent[],
  candidate: ConflictCandidate,
): CalendarEvent[] {
  const time = candidate.time?.trim();
  if (!time) {
    return [];
  }

  return events.filter((event) => {
    if (candidate.excludeEventId && event.id === candidate.excludeEventId) {
      return false;
    }

    return event.date === candidate.date && event.time === time;
  });
}
