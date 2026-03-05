import type { EventListFilters } from "@/lib/types";

export type Calendar2CategoryFilter = "all" | "event" | "task" | "pending" | "done";

export function buildCalendar2EventFilters(input: {
  q: string;
  category: Calendar2CategoryFilter;
}): EventListFilters {
  const filters: EventListFilters = {};
  const query = input.q.trim();
  if (query) {
    filters.q = query;
  }

  if (input.category === "event" || input.category === "task") {
    filters.type = input.category;
  }
  if (input.category === "pending" || input.category === "done") {
    filters.status = input.category;
  }

  return filters;
}
