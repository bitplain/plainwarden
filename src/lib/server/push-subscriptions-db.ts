import prisma from "@/lib/server/prisma";

export interface PushSubscriptionPayload {
  endpoint: string;
  expirationTime?: number | null;
  keys: {
    p256dh: string;
    auth: string;
  };
}

function toDateOrNull(value?: number | null): Date | null {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    return null;
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export async function upsertPushSubscriptionForUser(input: {
  userId: string;
  subscription: PushSubscriptionPayload;
  userAgent?: string;
}) {
  return prisma.pushSubscription.upsert({
    where: {
      userId_endpoint: {
        userId: input.userId,
        endpoint: input.subscription.endpoint,
      },
    },
    update: {
      p256dh: input.subscription.keys.p256dh,
      auth: input.subscription.keys.auth,
      expirationTime: toDateOrNull(input.subscription.expirationTime),
      userAgent: input.userAgent,
      disabledAt: null,
      failureCount: 0,
    },
    create: {
      userId: input.userId,
      endpoint: input.subscription.endpoint,
      p256dh: input.subscription.keys.p256dh,
      auth: input.subscription.keys.auth,
      expirationTime: toDateOrNull(input.subscription.expirationTime),
      userAgent: input.userAgent,
    },
  });
}

export async function disablePushSubscriptionForUser(input: { userId: string; endpoint: string }) {
  const result = await prisma.pushSubscription.updateMany({
    where: {
      userId: input.userId,
      endpoint: input.endpoint,
    },
    data: {
      disabledAt: new Date(),
    },
  });

  return result.count > 0;
}

export async function listActivePushSubscriptionsByUser(userId: string) {
  return prisma.pushSubscription.findMany({
    where: {
      userId,
      disabledAt: null,
    },
    orderBy: [{ updatedAt: "desc" }],
  });
}

export async function markPushSubscriptionSuccess(id: string) {
  await prisma.pushSubscription.update({
    where: { id },
    data: {
      failureCount: 0,
      lastSuccessAt: new Date(),
      lastFailureAt: null,
      disabledAt: null,
    },
  });
}

export async function markPushSubscriptionFailure(input: {
  id: string;
  disableNow?: boolean;
}) {
  const current = await prisma.pushSubscription.findUnique({
    where: { id: input.id },
    select: { failureCount: true },
  });

  if (!current) return;

  const nextFailures = current.failureCount + 1;
  const shouldDisable = input.disableNow === true || nextFailures >= 5;

  await prisma.pushSubscription.update({
    where: { id: input.id },
    data: {
      failureCount: nextFailures,
      lastFailureAt: new Date(),
      ...(shouldDisable ? { disabledAt: new Date() } : {}),
    },
  });
}
