import type { EventListFilters } from "@/lib/types";

export function buildEventListSearchParams(filters: EventListFilters = {}): URLSearchParams {
  const searchParams = new URLSearchParams();

  if (filters.q) {
    searchParams.set("q", filters.q);
  }
  if (filters.type) {
    searchParams.set("type", filters.type);
  }
  if (filters.status) {
    searchParams.set("status", filters.status);
  }
  if (filters.dateFrom) {
    searchParams.set("dateFrom", filters.dateFrom);
  }
  if (filters.dateTo) {
    searchParams.set("dateTo", filters.dateTo);
  }

  return searchParams;
}

export function buildEventListQueryString(filters: EventListFilters = {}): string {
  return buildEventListSearchParams(filters).toString();
}
