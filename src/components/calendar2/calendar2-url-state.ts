import type { Calendar2CategoryFilter } from "./calendar2-query-filters";
import type { Calendar2Tab, Calendar2View } from "./calendar2-types";

const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

const TAB_VALUES = new Set<Calendar2Tab>(["calendar", "planner", "kanban", "notes", "ai"]);
const VIEW_VALUES = new Set<Calendar2View>(["month", "week", "day"]);
const CATEGORY_VALUES = new Set<Calendar2CategoryFilter>([
  "all",
  "event",
  "task",
  "pending",
  "done",
]);

export interface Calendar2UrlState {
  q: string;
  tab: Calendar2Tab;
  view: Calendar2View;
  category: Calendar2CategoryFilter;
  dateFrom: string;
  dateTo: string;
  date: string;
}

function normalizeDate(value: string | null): string | undefined {
  if (!value) {
    return undefined;
  }

  const normalized = value.trim();
  if (!ISO_DATE_REGEX.test(normalized)) {
    return undefined;
  }

  const [yearRaw, monthRaw, dayRaw] = normalized.split("-");
  const year = Number(yearRaw);
  const month = Number(monthRaw);
  const day = Number(dayRaw);
  const date = new Date(year, month - 1, day);

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return undefined;
  }

  return normalized;
}

function parseTab(value: string | null): Calendar2Tab {
  return value && TAB_VALUES.has(value as Calendar2Tab) ? (value as Calendar2Tab) : "calendar";
}

function parseView(value: string | null): Calendar2View {
  return value && VIEW_VALUES.has(value as Calendar2View) ? (value as Calendar2View) : "month";
}

function parseCategory(value: string | null): Calendar2CategoryFilter {
  return value && CATEGORY_VALUES.has(value as Calendar2CategoryFilter)
    ? (value as Calendar2CategoryFilter)
    : "all";
}

function normalizeDateRange(input: {
  dateFrom?: string;
  dateTo?: string;
}): { dateFrom: string; dateTo: string } {
  const dateFrom = input.dateFrom ?? "";
  const dateTo = input.dateTo ?? "";

  if (dateFrom && dateTo && dateFrom > dateTo) {
    return {
      dateFrom: dateTo,
      dateTo: dateFrom,
    };
  }

  return {
    dateFrom,
    dateTo,
  };
}

function setOrDelete(params: URLSearchParams, key: string, value?: string) {
  if (!value) {
    params.delete(key);
    return;
  }
  params.set(key, value);
}

export function parseCalendar2UrlState(
  searchParams: URLSearchParams,
  fallbackDate: string,
): Calendar2UrlState {
  const dateRange = normalizeDateRange({
    dateFrom: normalizeDate(searchParams.get("dateFrom")) ?? "",
    dateTo: normalizeDate(searchParams.get("dateTo")) ?? "",
  });

  return {
    q: (searchParams.get("q") ?? "").trim(),
    tab: parseTab(searchParams.get("tab")),
    view: parseView(searchParams.get("view")),
    category: parseCategory(searchParams.get("category")),
    dateFrom: dateRange.dateFrom,
    dateTo: dateRange.dateTo,
    date: normalizeDate(searchParams.get("date")) ?? fallbackDate,
  };
}

export function buildCalendar2UrlQuery(input: {
  currentSearchParams: URLSearchParams;
  state: Calendar2UrlState;
}): string {
  const params = new URLSearchParams(input.currentSearchParams.toString());
  const dateRange = normalizeDateRange({
    dateFrom: normalizeDate(input.state.dateFrom),
    dateTo: normalizeDate(input.state.dateTo),
  });

  setOrDelete(params, "q", input.state.q.trim() || undefined);
  setOrDelete(params, "tab", input.state.tab === "calendar" ? undefined : input.state.tab);
  setOrDelete(params, "view", input.state.view === "month" ? undefined : input.state.view);
  setOrDelete(
    params,
    "category",
    input.state.category === "all" ? undefined : input.state.category,
  );
  setOrDelete(params, "dateFrom", dateRange.dateFrom || undefined);
  setOrDelete(params, "dateTo", dateRange.dateTo || undefined);
  setOrDelete(params, "date", normalizeDate(input.state.date));

  return params.toString();
}
