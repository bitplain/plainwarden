import { addDays, format } from "date-fns";

export type ReminderKind = "due_today" | "due_tomorrow" | "overdue";

export interface ReminderCandidateInput {
  sourceType: "calendar_event" | "kanban_card";
  sourceId: string;
  title: string;
  dueDate: string;
  dueTime?: string | null;
  navigateTo: string;
}

export interface ReminderCandidate {
  sourceType: ReminderCandidateInput["sourceType"];
  sourceId: string;
  title: string;
  dueDate: string;
  navigateTo: string;
  kind: ReminderKind;
  severity: number;
  dedupeKey: string;
  dedupeBucket: string;
}

export interface PushRateItem {
  id: string;
  severity: number;
}

function isValidTime(value: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

function classifyKind(input: {
  dueDate: string;
  today: string;
  tomorrow: string;
}): ReminderKind | null {
  const { dueDate, today, tomorrow } = input;

  if (dueDate < today) {
    return "overdue";
  }

  if (dueDate === today) {
    return "due_today";
  }

  if (dueDate === tomorrow) {
    return "due_tomorrow";
  }

  return null;
}

function kindSeverity(kind: ReminderKind): number {
  if (kind === "overdue") return 3;
  if (kind === "due_today") return 2;
  return 1;
}

function getSeverity(input: { kind: ReminderKind; dueDate: string; dueTime?: string | null; today: string }) {
  const baseSeverity = kindSeverity(input.kind);
  if (input.kind === "due_today" && input.dueDate === input.today) {
    const dueTime = typeof input.dueTime === "string" ? input.dueTime : "";
    if (isValidTime(dueTime)) {
      // Time-specific event: prioritize above generic overdue backlog so same-day events are not starved.
      return 4;
    }
  }
  return baseSeverity;
}

export function buildReminderCandidates(input: {
  userId: string;
  nowIso: string;
  items: ReminderCandidateInput[];
}): ReminderCandidate[] {
  const now = new Date(input.nowIso);
  const today = format(now, "yyyy-MM-dd");
  const tomorrow = format(addDays(now, 1), "yyyy-MM-dd");

  return input.items
    .map((item) => {
      const kind = classifyKind({
        dueDate: item.dueDate,
        today,
        tomorrow,
      });
      if (!kind) return null;

      const severity = getSeverity({
        kind,
        dueDate: item.dueDate,
        dueTime: item.dueTime,
        today,
      });

      const dedupeKeySuffix =
        item.dueTime && isValidTime(item.dueTime)
          ? `${kind}:${item.dueDate}:${item.dueTime}`
          : `${kind}:${item.dueDate}`;

      return {
        sourceType: item.sourceType,
        sourceId: item.sourceId,
        title: item.title,
        dueDate: item.dueDate,
        navigateTo: item.navigateTo,
        kind,
        severity,
        dedupeBucket: item.dueDate,
        dedupeKey: `${input.userId}:${item.sourceType}:${item.sourceId}:${dedupeKeySuffix}`,
      } satisfies ReminderCandidate;
    })
    .filter((item): item is ReminderCandidate => Boolean(item))
    .sort((a, b) => {
      if (a.severity !== b.severity) return b.severity - a.severity;
      if (a.dueDate !== b.dueDate) return a.dueDate.localeCompare(b.dueDate);
      return a.title.localeCompare(b.title);
    });
}

export function applyPushRateLimit(input: {
  alreadySentInLastHour: number;
  hourlyLimit: number;
  reminders: PushRateItem[];
}): { allowed: PushRateItem[]; dropped: PushRateItem[] } {
  const budget = Math.max(0, input.hourlyLimit - input.alreadySentInLastHour);
  const sorted = [...input.reminders].sort((a, b) => b.severity - a.severity);

  return {
    allowed: sorted.slice(0, budget),
    dropped: sorted.slice(budget),
  };
}
