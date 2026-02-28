import { subHours } from "date-fns";
import type { ReminderCandidate } from "@/lib/server/reminder-engine";
import prisma from "@/lib/server/prisma";

export async function saveReminderCandidates(userId: string, candidates: ReminderCandidate[]) {
  if (candidates.length === 0) {
    return { created: 0 };
  }

  const result = await prisma.agentReminder.createMany({
    data: candidates.map((candidate) => ({
      userId,
      sourceType: candidate.sourceType,
      sourceId: candidate.sourceId,
      title: candidate.title,
      body:
        candidate.kind === "overdue"
          ? `Просрочено: ${candidate.title}`
          : candidate.kind === "due_today"
            ? `Срок сегодня: ${candidate.title}`
            : `Срок завтра: ${candidate.title}`,
      kind: candidate.kind,
      channel: candidate.severity >= 2 ? "push" : "in_app",
      severity: candidate.severity,
      dueDate: candidate.dueDate,
      navigateTo: candidate.navigateTo,
      dedupeBucket: candidate.dedupeBucket,
      dedupeKey: candidate.dedupeKey,
    })),
    skipDuplicates: true,
  });

  return {
    created: result.count,
  };
}

export async function listUnreadRemindersForUser(userId: string, limit = 20) {
  return prisma.agentReminder.findMany({
    where: {
      userId,
      readAt: null,
    },
    orderBy: [{ severity: "desc" }, { createdAt: "desc" }],
    take: Math.min(100, Math.max(1, limit)),
  });
}

export async function markReminderReadForUser(userId: string, reminderId: string) {
  const result = await prisma.agentReminder.updateMany({
    where: {
      id: reminderId,
      userId,
      readAt: null,
    },
    data: {
      readAt: new Date(),
    },
  });

  return result.count > 0;
}

export async function countPushedInLastHour(userId: string, now = new Date()) {
  return prisma.agentReminder.count({
    where: {
      userId,
      pushedAt: {
        gte: subHours(now, 1),
      },
    },
  });
}

export async function listPendingPushReminders(userId: string, limit = 20) {
  return prisma.agentReminder.findMany({
    where: {
      userId,
      readAt: null,
      pushedAt: null,
      channel: "push",
    },
    orderBy: [{ severity: "desc" }, { createdAt: "asc" }],
    take: Math.min(100, Math.max(1, limit)),
  });
}

export async function markRemindersPushed(reminderIds: string[]) {
  if (reminderIds.length === 0) {
    return 0;
  }

  const result = await prisma.agentReminder.updateMany({
    where: {
      id: { in: reminderIds },
    },
    data: {
      pushedAt: new Date(),
    },
  });

  return result.count;
}
