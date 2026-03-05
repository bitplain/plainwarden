"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { AuthUser, CalendarEvent } from "@/lib/types";
import type { AppNotification } from "@/components/calendar2/calendar2-types";

const DEFAULT_REMINDER_TIMEZONE = "Europe/Moscow";
const HH_MM_TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;
const YYYY_MM_DD_REGEX = /^\d{4}-\d{2}-\d{2}$/;

interface TimeZoneParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
}

export interface PreciseReminderCandidate {
  event: CalendarEvent;
  sessionKey: string;
  targetTimestamp: number;
}

interface TriggerDuePreciseRemindersInput {
  events: CalendarEvent[];
  firedSessionKeys: Set<string>;
  addNotification: (input: Omit<AppNotification, "id" | "read" | "createdAt">) => void;
  isAuthenticated: boolean;
  now?: Date;
  timeZone?: string;
  fetchFn?: typeof fetch;
}

function parseNumber(value: string): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function parseDateKey(value: string): { year: number; month: number; day: number } | null {
  if (!YYYY_MM_DD_REGEX.test(value)) {
    return null;
  }

  const [year, month, day] = value.split("-").map((part) => parseNumber(part));
  return { year, month, day };
}

function parseTimeKey(value: string): { hour: number; minute: number } | null {
  if (!HH_MM_TIME_REGEX.test(value)) {
    return null;
  }
  const [hour, minute] = value.split(":").map((part) => parseNumber(part));
  return { hour, minute };
}

function getTimeZoneParts(date: Date, timeZone: string): TimeZoneParts {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  const byType = new Map(formatter.formatToParts(date).map((part) => [part.type, part.value]));
  return {
    year: parseNumber(byType.get("year") ?? "0"),
    month: parseNumber(byType.get("month") ?? "0"),
    day: parseNumber(byType.get("day") ?? "0"),
    hour: parseNumber(byType.get("hour") ?? "0"),
    minute: parseNumber(byType.get("minute") ?? "0"),
    second: parseNumber(byType.get("second") ?? "0"),
  };
}

function getTimeZoneOffsetMs(dateUtcMs: number, timeZone: string): number {
  const parts = getTimeZoneParts(new Date(dateUtcMs), timeZone);
  const asUtcMs = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second,
  );
  return asUtcMs - dateUtcMs;
}

function zonedDateTimeToTimestamp(dateKey: string, timeKey: string, timeZone: string): number | null {
  const dateParts = parseDateKey(dateKey);
  const timeParts = parseTimeKey(timeKey);
  if (!dateParts || !timeParts) {
    return null;
  }

  const naiveUtcMs = Date.UTC(
    dateParts.year,
    dateParts.month - 1,
    dateParts.day,
    timeParts.hour,
    timeParts.minute,
    0,
    0,
  );

  const offset1 = getTimeZoneOffsetMs(naiveUtcMs, timeZone);
  let resolvedMs = naiveUtcMs - offset1;
  const offset2 = getTimeZoneOffsetMs(resolvedMs, timeZone);
  if (offset2 !== offset1) {
    resolvedMs = naiveUtcMs - offset2;
  }

  return resolvedMs;
}

function getTodayDateKey(now: Date, timeZone: string): string {
  const parts = getTimeZoneParts(now, timeZone);
  const year = parts.year.toString().padStart(4, "0");
  const month = parts.month.toString().padStart(2, "0");
  const day = parts.day.toString().padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getReminderSessionKey(event: CalendarEvent): string {
  return `${event.id}:${event.date}:${event.time ?? ""}`;
}

export function findNextPreciseReminderCandidate(input: {
  events: CalendarEvent[];
  firedSessionKeys: Set<string>;
  now?: Date;
  timeZone?: string;
}): PreciseReminderCandidate | null {
  const now = input.now ?? new Date();
  const timeZone = input.timeZone ?? DEFAULT_REMINDER_TIMEZONE;
  const today = getTodayDateKey(now, timeZone);

  let next: PreciseReminderCandidate | null = null;
  for (const event of input.events) {
    if ((event.status ?? "pending") === "done") {
      continue;
    }
    if (event.date !== today) {
      continue;
    }
    if (!event.time || !HH_MM_TIME_REGEX.test(event.time)) {
      continue;
    }

    const targetTimestamp = zonedDateTimeToTimestamp(event.date, event.time, timeZone);
    if (targetTimestamp === null) {
      continue;
    }

    const sessionKey = getReminderSessionKey(event);
    if (input.firedSessionKeys.has(sessionKey)) {
      continue;
    }

    if (!next || targetTimestamp < next.targetTimestamp) {
      next = {
        event,
        sessionKey,
        targetTimestamp,
      };
    }
  }

  return next;
}

export async function triggerDuePreciseReminders(input: TriggerDuePreciseRemindersInput) {
  if (!input.isAuthenticated) {
    return { fired: 0 };
  }

  const now = input.now ?? new Date();
  const timeZone = input.timeZone ?? DEFAULT_REMINDER_TIMEZONE;
  const fetchFn = input.fetchFn ?? fetch;
  const today = getTodayDateKey(now, timeZone);

  const dueNow = input.events
    .filter((event) => {
      if ((event.status ?? "pending") === "done") {
        return false;
      }
      if (event.date !== today || !event.time || !HH_MM_TIME_REGEX.test(event.time)) {
        return false;
      }

      const sessionKey = getReminderSessionKey(event);
      if (input.firedSessionKeys.has(sessionKey)) {
        return false;
      }

      const targetTimestamp = zonedDateTimeToTimestamp(event.date, event.time, timeZone);
      if (targetTimestamp === null) {
        return false;
      }

      return targetTimestamp <= now.getTime();
    })
    .sort((a, b) => {
      const aTime = zonedDateTimeToTimestamp(a.date, a.time!, timeZone) ?? Number.MAX_SAFE_INTEGER;
      const bTime = zonedDateTimeToTimestamp(b.date, b.time!, timeZone) ?? Number.MAX_SAFE_INTEGER;
      return aTime - bTime;
    });

  for (const event of dueNow) {
    const sessionKey = getReminderSessionKey(event);
    input.firedSessionKeys.add(sessionKey);

    input.addNotification({
      kind: "reminder",
      title: event.title,
      body: `Срок сейчас: ${event.time}`,
      eventId: event.id,
    });

    await fetchFn("/api/agent/reminders/tick", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        source: "calendar-local-timer",
        nowIso: new Date().toISOString(),
      }),
      credentials: "include",
      keepalive: true,
    }).catch(() => undefined);
  }

  return { fired: dueNow.length };
}

export function usePreciseReminderTick(input: {
  events: CalendarEvent[];
  user: AuthUser | null;
  isAuthenticated: boolean;
  addNotification: (input: Omit<AppNotification, "id" | "read" | "createdAt">) => void;
}) {
  const firedSessionKeysRef = useRef<Set<string>>(new Set());
  const [tickVersion, setTickVersion] = useState(0);
  const userId = input.user?.id ?? null;

  const candidate = useMemo(
    () =>
      findNextPreciseReminderCandidate({
        events: input.events,
        firedSessionKeys: firedSessionKeysRef.current,
      }),
    [input.events, tickVersion, userId],
  );

  useEffect(() => {
    if (!input.isAuthenticated || !input.user) {
      firedSessionKeysRef.current.clear();
      return;
    }

    if (!candidate) {
      return;
    }

    const delayMs = Math.max(0, candidate.targetTimestamp - Date.now());
    const timeoutId = window.setTimeout(() => {
      void triggerDuePreciseReminders({
        events: input.events,
        firedSessionKeys: firedSessionKeysRef.current,
        addNotification: input.addNotification,
        isAuthenticated: input.isAuthenticated,
      }).finally(() => {
        setTickVersion((prev) => prev + 1);
      });
    }, delayMs);

    return () => window.clearTimeout(timeoutId);
  }, [candidate, input.addNotification, input.events, input.isAuthenticated, input.user]);
}
