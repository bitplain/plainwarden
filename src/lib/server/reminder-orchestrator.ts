import { addDays, format } from "date-fns";
import { applyPushRateLimit, buildReminderCandidates } from "@/lib/server/reminder-engine";
import {
  countPushedInLastHour,
  listPendingPushReminders,
  markRemindersPushed,
  saveReminderCandidates,
} from "@/lib/server/reminder-db";
import { sendPushToUser } from "@/lib/server/push-delivery";
import prisma from "@/lib/server/prisma";

async function collectUserReminderSources(input: { userId: string; nowIso: string }) {
  const now = new Date(input.nowIso);
  const today = format(now, "yyyy-MM-dd");
  const tomorrow = format(addDays(now, 1), "yyyy-MM-dd");

  const [events, cards] = await Promise.all([
    prisma.event.findMany({
      where: {
        userId: input.userId,
        status: "pending",
        date: {
          lte: tomorrow,
        },
      },
      select: {
        id: true,
        title: true,
        date: true,
      },
      orderBy: [{ date: "asc" }],
      take: 200,
    }),
    prisma.kanbanCard.findMany({
      where: {
        userId: input.userId,
        dueDate: {
          not: null,
          lte: tomorrow,
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
    today,
    items: [
      ...events.map((event) => ({
        sourceType: "calendar_event" as const,
        sourceId: event.id,
        title: event.title,
        dueDate: event.date,
        navigateTo: "/calendar",
      })),
      ...cards
        .filter((card): card is typeof card & { dueDate: string } => Boolean(card.dueDate))
        .map((card) => ({
          sourceType: "kanban_card" as const,
          sourceId: card.id,
          title: card.title,
          dueDate: card.dueDate,
          navigateTo: "/kanban",
        })),
    ],
  };
}

export async function runReminderJob(input: {
  nowIso?: string;
  userId?: string;
  hourlyPushLimit?: number;
}) {
  const nowIso = input.nowIso ?? new Date().toISOString();
  const hourlyPushLimit = input.hourlyPushLimit ?? 3;

  const users = input.userId
    ? [{ id: input.userId }]
    : await prisma.user.findMany({
        select: { id: true },
      });

  const summaries: Array<{
    userId: string;
    candidates: number;
    created: number;
    pushAllowed: number;
    pushDropped: number;
    pushSent: number;
  }> = [];

  for (const user of users) {
    const source = await collectUserReminderSources({ userId: user.id, nowIso });
    const candidates = buildReminderCandidates({
      userId: user.id,
      nowIso,
      items: source.items,
    });

    const saved = await saveReminderCandidates(user.id, candidates);
    const pendingPush = await listPendingPushReminders(user.id, 50);
    const sentInLastHour = await countPushedInLastHour(user.id, new Date(nowIso));

    const limited = applyPushRateLimit({
      alreadySentInLastHour: sentInLastHour,
      hourlyLimit: hourlyPushLimit,
      reminders: pendingPush.map((reminder) => ({
        id: reminder.id,
        severity: reminder.severity,
      })),
    });

    let pushSent = 0;
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

      pushSent += sent.sent;
      // Mark as pushed even when no active subscription to avoid repeated spam attempts.
      await markRemindersPushed([reminder.id]);
    }

    summaries.push({
      userId: user.id,
      candidates: candidates.length,
      created: saved.created,
      pushAllowed: limited.allowed.length,
      pushDropped: limited.dropped.length,
      pushSent,
    });
  }

  return {
    nowIso,
    users: summaries,
  };
}
