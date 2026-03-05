import { addMinutes } from "date-fns";
import { applyPushRateLimit, buildReminderCandidates } from "@/lib/server/reminder-engine";
import {
  countPushedInLastHour,
  listPendingPushReminders,
  markReminderPushDelivered,
  markReminderPushFailedFinal,
  markReminderPushRetryScheduled,
  saveReminderCandidates,
} from "@/lib/server/reminder-db";
import { sendPushToUser } from "@/lib/server/push-delivery";
import { getReminderDateContext, getReminderNow } from "@/lib/server/reminder-time";
import prisma from "@/lib/server/prisma";

async function collectUserReminderSources(input: { userId: string; nowIso: string }) {
  const context = getReminderDateContext(input.nowIso);

  const [events, cards] = await Promise.all([
    prisma.event.findMany({
      where: {
        userId: input.userId,
        status: "pending",
        date: {
          lte: context.tomorrow,
        },
      },
      select: {
        id: true,
        title: true,
        date: true,
        time: true,
      },
      orderBy: [{ date: "asc" }],
      take: 200,
    }),
    prisma.kanbanCard.findMany({
      where: {
        userId: input.userId,
        dueDate: {
          not: null,
          lte: context.tomorrow,
        },
        column: {
          isDone: false,
        },
      },
      select: {
        id: true,
        title: true,
        dueDate: true,
      },
      orderBy: [{ dueDate: "asc" }],
      take: 200,
    }),
  ]);

  return {
    today: context.today,
    items: [
      ...events.map((event) => ({
        sourceType: "calendar_event" as const,
        sourceId: event.id,
        title: event.title,
        dueDate: event.date,
        dueTime: event.time,
        navigateTo: "/calendar",
      })),
      ...cards
        .filter((card): card is typeof card & { dueDate: string } => Boolean(card.dueDate))
        .map((card) => ({
          sourceType: "kanban_card" as const,
          sourceId: card.id,
          title: card.title,
          dueDate: card.dueDate,
          navigateTo: "/calendar?tab=kanban",
        })),
    ],
  };
}

function getRetryDelayMinutes(nextAttemptCount: number): number {
  if (nextAttemptCount <= 1) return 2;
  if (nextAttemptCount === 2) return 4;
  return 4;
}

function buildPushFailureMessage(input: {
  hasActiveSubscriptions: boolean;
  permanentFailed: number;
  transientFailed: number;
}): string {
  if (!input.hasActiveSubscriptions) {
    return "No active push subscriptions";
  }
  if (input.permanentFailed > 0 && input.transientFailed === 0) {
    return "Permanent push failure";
  }
  if (input.transientFailed > 0) {
    return "Transient push retries exhausted";
  }
  return "Push delivery failed";
}

export interface ReminderJobUserSummary {
  userId: string;
  candidates: number;
  created: number;
  pushAllowed: number;
  pushDropped: number;
  pushSent: number;
  pushRetried: number;
  pushRetryScheduled: number;
  pushFailedFinal: number;
  retried: number;
}

export interface ReminderJobTotals {
  candidates: number;
  created: number;
  pushAllowed: number;
  pushDropped: number;
  pushSent: number;
  pushRetried: number;
  pushRetryScheduled: number;
  pushFailedFinal: number;
}

export async function runReminderJob(input: {
  nowIso?: string;
  userId?: string;
  hourlyPushLimit?: number;
}) {
  const now = getReminderNow(input.nowIso);
  const nowIso = now.toISOString();
  const hourlyPushLimit = input.hourlyPushLimit ?? 3;

  const users = input.userId
    ? [{ id: input.userId }]
    : await prisma.user.findMany({
        select: { id: true },
      });

  const summaries: ReminderJobUserSummary[] = [];
  const totals: ReminderJobTotals = {
    candidates: 0,
    created: 0,
    pushAllowed: 0,
    pushDropped: 0,
    pushSent: 0,
    pushRetried: 0,
    pushRetryScheduled: 0,
    pushFailedFinal: 0,
  };

  for (const user of users) {
    const source = await collectUserReminderSources({ userId: user.id, nowIso });
    const candidates = buildReminderCandidates({
      userId: user.id,
      nowIso,
      items: source.items,
    });

    const saved = await saveReminderCandidates(user.id, candidates);
    const pendingPush = await listPendingPushReminders(user.id, 50, now);
    const sentInLastHour = await countPushedInLastHour(user.id, now);

    const limited = applyPushRateLimit({
      alreadySentInLastHour: sentInLastHour,
      hourlyLimit: hourlyPushLimit,
      reminders: pendingPush.map((reminder) => ({
        id: reminder.id,
        severity: reminder.severity,
      })),
    });

    const summary: ReminderJobUserSummary = {
      userId: user.id,
      candidates: candidates.length,
      created: saved.created,
      pushAllowed: limited.allowed.length,
      pushDropped: limited.dropped.length,
      pushSent: 0,
      pushRetried: 0,
      pushRetryScheduled: 0,
      pushFailedFinal: 0,
      retried: 0,
    };

    for (const allowed of limited.allowed) {
      const reminder = pendingPush.find((item) => item.id === allowed.id);
      if (!reminder) continue;

      const sent = await sendPushToUser({
        userId: user.id,
        payload: {
          title: reminder.title,
          body: reminder.body,
          navigateTo: reminder.navigateTo ?? undefined,
          tag: reminder.dedupeKey,
        },
      });

      summary.pushSent += sent.sent;

      if (sent.sent > 0) {
        await markReminderPushDelivered({
          reminderId: reminder.id,
          expectedAttemptCount: reminder.pushAttemptCount,
          now,
        });
        continue;
      }

      const nextAttemptCount = reminder.pushAttemptCount + 1;
      if (sent.transientFailed > 0) {
        summary.pushRetried += 1;
        if (nextAttemptCount < 3) {
          const retryAt = addMinutes(now, getRetryDelayMinutes(nextAttemptCount));
          const scheduled = await markReminderPushRetryScheduled({
            reminderId: reminder.id,
            expectedAttemptCount: reminder.pushAttemptCount,
            nextPushAttemptAt: retryAt,
            lastPushError: "Transient push failure",
            now,
          });
          if (scheduled) {
            summary.pushRetryScheduled += 1;
          }
          continue;
        }
      }

      const finalized = await markReminderPushFailedFinal({
        reminderId: reminder.id,
        expectedAttemptCount: reminder.pushAttemptCount,
        lastPushError: buildPushFailureMessage(sent),
        now,
      });
      if (finalized) {
        summary.pushFailedFinal += 1;
      }
    }

    summary.retried = summary.pushRetried;
    summaries.push(summary);
    totals.candidates += summary.candidates;
    totals.created += summary.created;
    totals.pushAllowed += summary.pushAllowed;
    totals.pushDropped += summary.pushDropped;
    totals.pushSent += summary.pushSent;
    totals.pushRetried += summary.pushRetried;
    totals.pushRetryScheduled += summary.pushRetryScheduled;
    totals.pushFailedFinal += summary.pushFailedFinal;
  }

  return {
    nowIso,
    users: summaries,
    totals,
  };
}
