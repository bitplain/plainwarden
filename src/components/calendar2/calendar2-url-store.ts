import { startOfDay } from "date-fns";
import { useCallback, useSyncExternalStore } from "react";
import { toDateKey } from "@/components/calendar/date-utils";
import {
  buildCalendar2UrlQuery,
  parseCalendar2UrlState,
  type Calendar2UrlState,
} from "./calendar2-url-state";

const CALENDAR2_URL_STORE_EVENT = "calendar2:url-store-change";

export type Calendar2UrlHistoryMode = "replace" | "push";
export type Calendar2UrlStateUpdater = (prev: Calendar2UrlState) => Calendar2UrlState;

export interface Calendar2UrlChangeResult {
  currentQuery: string;
  nextQuery: string;
  nextUrl: string;
  changed: boolean;
}

function normalizeSearch(search: string): string {
  return search.startsWith("?") ? search.slice(1) : search;
}

function getFallbackDateKey(): string {
  return toDateKey(startOfDay(new Date()));
}

export function readCalendar2UrlStateFromSearch(
  search: string,
  fallbackDateKey = getFallbackDateKey(),
): Calendar2UrlState {
  return parseCalendar2UrlState(new URLSearchParams(normalizeSearch(search)), fallbackDateKey);
}

export function readCalendar2UrlStateFromWindow(): Calendar2UrlState {
  if (typeof window === "undefined") {
    return readCalendar2UrlStateFromSearch("", getFallbackDateKey());
  }

  return readCalendar2UrlStateFromSearch(window.location.search, getFallbackDateKey());
}

export function subscribeCalendar2UrlStore(onStoreChange: () => void): () => void {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  const handleChange = () => onStoreChange();
  window.addEventListener("popstate", handleChange);
  window.addEventListener(CALENDAR2_URL_STORE_EVENT, handleChange);

  return () => {
    window.removeEventListener("popstate", handleChange);
    window.removeEventListener(CALENDAR2_URL_STORE_EVENT, handleChange);
  };
}

export function updateCalendar2UrlStateInWindow(
  updater: Calendar2UrlStateUpdater,
  mode: Calendar2UrlHistoryMode = "replace",
): void {
  if (typeof window === "undefined") {
    return;
  }

  const prevState = readCalendar2UrlStateFromWindow();
  const nextState = updater(prevState);
  const { changed, nextUrl } = buildCalendar2UrlChange({
    pathname: window.location.pathname,
    search: window.location.search,
    hash: window.location.hash,
    state: nextState,
  });

  if (!changed) {
    return;
  }

  if (mode === "push") {
    window.history.pushState(null, "", nextUrl);
  } else {
    window.history.replaceState(null, "", nextUrl);
  }

  window.dispatchEvent(new Event(CALENDAR2_URL_STORE_EVENT));
}

export function buildCalendar2UrlChange(input: {
  pathname: string;
  search: string;
  hash?: string;
  state: Calendar2UrlState;
}): Calendar2UrlChangeResult {
  const currentQuery = normalizeSearch(input.search);
  const nextQuery = buildCalendar2UrlQuery({
    currentSearchParams: new URLSearchParams(currentQuery),
    state: input.state,
  });
  const hash = input.hash ?? "";
  const nextUrl = nextQuery ? `${input.pathname}?${nextQuery}${hash}` : `${input.pathname}${hash}`;

  return {
    currentQuery,
    nextQuery,
    nextUrl,
    changed: nextQuery !== currentQuery,
  };
}

function getCalendar2UrlSnapshot(): Calendar2UrlState {
  return readCalendar2UrlStateFromWindow();
}

function getCalendar2UrlServerSnapshot(): Calendar2UrlState {
  return parseCalendar2UrlState(new URLSearchParams(), getFallbackDateKey());
}

export function useCalendar2UrlStore() {
  const state = useSyncExternalStore(
    subscribeCalendar2UrlStore,
    getCalendar2UrlSnapshot,
    getCalendar2UrlServerSnapshot,
  );

  const setState = useCallback(
    (updater: Calendar2UrlStateUpdater, mode: Calendar2UrlHistoryMode = "replace") => {
      updateCalendar2UrlStateInWindow(updater, mode);
    },
    [],
  );

  return {
    state,
    setState,
  };
}
