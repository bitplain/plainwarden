import type { EventListFilters } from "@/lib/types";

export type Calendar2CategoryFilter = "all" | "event" | "task" | "pending" | "done";

const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

function normalizeDate(value?: string): string | undefined {
  if (!value) {
    return undefined;
  }
  const normalized = value.trim();
  return ISO_DATE_REGEX.test(normalized) ? normalized : undefined;
}

export function buildCalendar2EventFilters(input: {
  q: string;
  category: Calendar2CategoryFilter;
  dateFrom?: string;
  dateTo?: string;
}): EventListFilters {
  const filters: EventListFilters = {};
  const query = input.q.trim();
  if (query) {
    filters.q = query;
  }

  const dateFrom = normalizeDate(input.dateFrom);
  const dateTo = normalizeDate(input.dateTo);
  if (dateFrom) {
    filters.dateFrom = dateFrom;
  }
  if (dateTo) {
    filters.dateTo = dateTo;
  }

  if (input.category === "event" || input.category === "task") {
    filters.type = input.category;
  }
  if (input.category === "pending" || input.category === "done") {
    filters.status = input.category;
  }

  return filters;
}
