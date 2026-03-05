const DEFAULT_REMINDER_TIMEZONE = "Europe/Moscow";

interface TimeParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
}

function isValidDate(value: Date): boolean {
  return Number.isFinite(value.getTime());
}

function parseIntPart(value: string): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function parseDateKey(value: string): { year: number; month: number; day: number } | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) {
    return null;
  }

  return {
    year: parseIntPart(match[1]),
    month: parseIntPart(match[2]),
    day: parseIntPart(match[3]),
  };
}

function buildDateKey(year: number, month: number, day: number): string {
  return `${year.toString().padStart(4, "0")}-${month.toString().padStart(2, "0")}-${day
    .toString()
    .padStart(2, "0")}`;
}

function resolveTimeZone(rawValue: string | undefined): string {
  const candidate = typeof rawValue === "string" ? rawValue.trim() : "";
  if (!candidate) {
    return DEFAULT_REMINDER_TIMEZONE;
  }

  try {
    new Intl.DateTimeFormat("en-US", { timeZone: candidate });
    return candidate;
  } catch {
    return DEFAULT_REMINDER_TIMEZONE;
  }
}

function getTimePartsInZone(date: Date, timeZone: string): TimeParts {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

  const parts = formatter.formatToParts(date);
  const map = new Map(parts.map((part) => [part.type, part.value]));

  return {
    year: parseIntPart(map.get("year") ?? "0"),
    month: parseIntPart(map.get("month") ?? "0"),
    day: parseIntPart(map.get("day") ?? "0"),
    hour: parseIntPart(map.get("hour") ?? "0"),
    minute: parseIntPart(map.get("minute") ?? "0"),
  };
}

export function getReminderTimeZone(): string {
  return resolveTimeZone(process.env.NETDEN_REMINDER_TZ);
}

export function getReminderNow(nowIso?: string): Date {
  if (!nowIso) {
    return new Date();
  }

  const parsed = new Date(nowIso);
  return isValidDate(parsed) ? parsed : new Date();
}

export function formatDateKeyInTimeZone(date: Date, timeZone: string): string {
  const parts = getTimePartsInZone(date, timeZone);
  return buildDateKey(parts.year, parts.month, parts.day);
}

export function formatTimeKeyInTimeZone(date: Date, timeZone: string): string {
  const parts = getTimePartsInZone(date, timeZone);
  return `${parts.hour.toString().padStart(2, "0")}:${parts.minute.toString().padStart(2, "0")}`;
}

export function addDaysToDateKey(dateKey: string, days: number): string {
  const parsed = parseDateKey(dateKey);
  if (!parsed) {
    return dateKey;
  }

  const next = new Date(Date.UTC(parsed.year, parsed.month - 1, parsed.day + days));
  return buildDateKey(next.getUTCFullYear(), next.getUTCMonth() + 1, next.getUTCDate());
}

export function getReminderDateContext(nowIso?: string) {
  const now = getReminderNow(nowIso);
  const timeZone = getReminderTimeZone();
  const today = formatDateKeyInTimeZone(now, timeZone);

  return {
    now,
    timeZone,
    today,
    tomorrow: addDaysToDateKey(today, 1),
    nowTime: formatTimeKeyInTimeZone(now, timeZone),
  };
}
