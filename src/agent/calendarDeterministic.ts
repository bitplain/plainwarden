import type { AgentMessage } from "@/agent/types";
import type { CalendarEvent } from "@/lib/types";

const CREATE_VERB_RE = /(create|add|schedule|plan|set\s+up|создай|добавь|запланируй|назначь|поставь)/i;
const MEETING_RE = /(meeting|call|встреч|созвон|митинг)/i;
const TODAY_RE = /(?:\btoday\b|сегодня)/i;
const TOMORROW_RE = /(?:\btomorrow\b|завтра)/i;
const ISO_DATE_RE = /\b(\d{4})-(\d{2})-(\d{2})\b/;
const DMY_DATE_RE = /\b(\d{1,2})[./](\d{1,2})(?:[./](\d{2,4}))?\b/;
const TIME_RE = /\b([01]?\d|2[0-3])[:.\s]([0-5]\d)\b/;
const CONTINUATION_RE =
  /^\s*(?:тогда|ок|okay|ok|ладно|хорошо|ну тогда)?\s*(?:на|в)\s*([01]?\d|2[0-3])[:.\s]([0-5]\d)\b/i;

const RU_MONTHS: Record<string, number> = {
  января: 1,
  февраля: 2,
  марта: 3,
  апреля: 4,
  мая: 5,
  июня: 6,
  июля: 7,
  августа: 8,
  сентября: 9,
  октября: 10,
  ноября: 11,
  декабря: 12,
};

export interface DeterministicMeetingDraft {
  title: string;
  date: string;
  time: string;
  description: string;
}

export interface DeterministicMeetingAvailabilityQuery {
  date: string;
  time?: string;
}

function toIsoDateFromParts(year: number, month: number, day: number): string {
  const date = new Date(Date.UTC(year, month - 1, day));
  const y = date.getUTCFullYear();
  const m = `${date.getUTCMonth() + 1}`.padStart(2, "0");
  const d = `${date.getUTCDate()}`.padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function timezoneNowParts(nowIso: string, timezone: string): { year: number; month: number; day: number } {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  const parts = formatter.formatToParts(new Date(nowIso));
  const year = Number(parts.find((part) => part.type === "year")?.value ?? "0");
  const month = Number(parts.find((part) => part.type === "month")?.value ?? "0");
  const day = Number(parts.find((part) => part.type === "day")?.value ?? "0");
  return { year, month, day };
}

function addDaysInTimezone(nowIso: string, timezone: string, dayOffset: number): string {
  const { year, month, day } = timezoneNowParts(nowIso, timezone);
  return toIsoDateFromParts(year, month, day + dayOffset);
}

function parseDateFromMessage(message: string, nowIso: string, timezone: string): string | null {
  if (TODAY_RE.test(message)) {
    return addDaysInTimezone(nowIso, timezone, 0);
  }

  if (TOMORROW_RE.test(message)) {
    return addDaysInTimezone(nowIso, timezone, 1);
  }

  const isoMatch = message.match(ISO_DATE_RE);
  if (isoMatch) {
    const year = Number(isoMatch[1]);
    const month = Number(isoMatch[2]);
    const day = Number(isoMatch[3]);
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return toIsoDateFromParts(year, month, day);
    }
  }

  const dmyMatch = message.match(DMY_DATE_RE);
  if (dmyMatch) {
    const day = Number(dmyMatch[1]);
    const month = Number(dmyMatch[2]);
    const yearCandidate = dmyMatch[3];
    const currentYear = timezoneNowParts(nowIso, timezone).year;
    const year = yearCandidate ? Number(yearCandidate.length === 2 ? `20${yearCandidate}` : yearCandidate) : currentYear;
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return toIsoDateFromParts(year, month, day);
    }
  }

  const monthNamesPattern = Object.keys(RU_MONTHS).join("|");
  const ruMonthMatch = message.match(new RegExp(`\\b(\\d{1,2})\\s+(${monthNamesPattern})(?:\\s+(\\d{4}))?\\b`, "i"));
  if (ruMonthMatch) {
    const day = Number(ruMonthMatch[1]);
    const monthName = ruMonthMatch[2].toLowerCase();
    const month = RU_MONTHS[monthName];
    const currentYear = timezoneNowParts(nowIso, timezone).year;
    const year = ruMonthMatch[3] ? Number(ruMonthMatch[3]) : currentYear;
    if (month && day >= 1 && day <= 31) {
      return toIsoDateFromParts(year, month, day);
    }
  }

  return null;
}

function parseTimeFromMessage(message: string): string | null {
  const match = message.match(TIME_RE);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    return null;
  }
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function extractTitle(message: string): string {
  const withMatch = message.match(/(?:^|\s)(?:с|with)\s+(.+)$/i);
  if (withMatch) {
    const subject = withMatch[1].trim().replace(/[.?!,;:]+$/g, "");
    if (subject) {
      return `Встреча с ${subject}`;
    }
  }

  const quoteMatch = message.match(/[«"]([^«»"]+)[»"]/);
  if (quoteMatch) {
    const title = quoteMatch[1].trim();
    if (title) {
      return title;
    }
  }

  return "Встреча";
}

function parseMeetingCreationExplicit(
  message: string,
  nowIso: string,
  timezone: string,
): DeterministicMeetingDraft | null {
  if (!CREATE_VERB_RE.test(message)) {
    return null;
  }

  if (!MEETING_RE.test(message)) {
    return null;
  }

  const date = parseDateFromMessage(message, nowIso, timezone);
  const time = parseTimeFromMessage(message);

  if (!date || !time) {
    return null;
  }

  return {
    title: extractTitle(message),
    description: "",
    date,
    time,
  };
}

function parseContinuationTime(message: string): string | null {
  const continuation = message.match(CONTINUATION_RE);
  if (!continuation) return null;

  const hours = Number(continuation[1]);
  const minutes = Number(continuation[2]);
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    return null;
  }

  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function findLatestMeetingDraftInHistory(
  history: AgentMessage[],
  nowIso: string,
  timezone: string,
): DeterministicMeetingDraft | null {
  for (let index = history.length - 1; index >= 0; index -= 1) {
    const item = history[index];
    if (item.role !== "user") {
      continue;
    }
    const parsed = parseMeetingCreationExplicit(item.content, nowIso, timezone);
    if (parsed) {
      return parsed;
    }
  }
  return null;
}

function isMeetingAvailabilityQuery(message: string): boolean {
  if (!MEETING_RE.test(message)) {
    return false;
  }

  if (/\?$/.test(message.trim())) {
    return true;
  }

  return /(есть|есть ли|какие|какая|покажи|проверь|check|show|list|do\s+i\s+have|have)/i.test(message);
}

export function extractMeetingDraftFromConversation(input: {
  message: string;
  history: AgentMessage[];
  nowIso: string;
  timezone: string;
}): DeterministicMeetingDraft | null {
  const explicit = parseMeetingCreationExplicit(input.message, input.nowIso, input.timezone);
  if (explicit) {
    return explicit;
  }

  const continuationTime = parseContinuationTime(input.message);
  if (!continuationTime) {
    return null;
  }

  const base = findLatestMeetingDraftInHistory(input.history, input.nowIso, input.timezone);
  if (!base) {
    return null;
  }

  return {
    ...base,
    time: continuationTime,
  };
}

export function extractMeetingAvailabilityQuery(input: {
  message: string;
  nowIso: string;
  timezone: string;
}): DeterministicMeetingAvailabilityQuery | null {
  if (!isMeetingAvailabilityQuery(input.message)) {
    return null;
  }

  const date = parseDateFromMessage(input.message, input.nowIso, input.timezone);
  if (!date) {
    return null;
  }

  const time = parseTimeFromMessage(input.message) ?? undefined;
  return { date, time };
}

export function findMeetingConflict(
  events: CalendarEvent[],
  date: string,
  time: string,
): CalendarEvent | null {
  return (
    events.find((event) => event.type === "event" && event.date === date && typeof event.time === "string" && event.time === time) ??
    null
  );
}
