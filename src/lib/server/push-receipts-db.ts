import { Prisma } from "@prisma/client";
import prisma from "@/lib/server/prisma";

const PUSH_RECEIPT_PREFIX = "push_receipt";

export type PushReceiptPhase = "sent" | "received" | "shown";

export interface PushReceiptRecord {
  version: 1;
  userId: string;
  token: string;
  sentAt?: string;
  receivedAt?: string;
  shownAt?: string;
  userAgent?: string;
  updatedAt: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function buildPushReceiptKey(userId: string, token: string): string {
  return `${PUSH_RECEIPT_PREFIX}:${userId}:${token}`;
}

function parsePushReceiptRecord(value: unknown): PushReceiptRecord | null {
  if (!isRecord(value)) {
    return null;
  }

  if (
    value.version !== 1 ||
    typeof value.userId !== "string" ||
    typeof value.token !== "string" ||
    typeof value.updatedAt !== "string"
  ) {
    return null;
  }

  const sentAt = typeof value.sentAt === "string" ? value.sentAt : undefined;
  const receivedAt = typeof value.receivedAt === "string" ? value.receivedAt : undefined;
  const shownAt = typeof value.shownAt === "string" ? value.shownAt : undefined;
  const userAgent = typeof value.userAgent === "string" ? value.userAgent : undefined;

  return {
    version: 1,
    userId: value.userId,
    token: value.token,
    sentAt,
    receivedAt,
    shownAt,
    userAgent,
    updatedAt: value.updatedAt,
  };
}

function toInputJsonValue(value: PushReceiptRecord): Prisma.InputJsonValue {
  return value as unknown as Prisma.InputJsonValue;
}

export async function getPushReceiptForUser(input: {
  userId: string;
  token: string;
}): Promise<PushReceiptRecord | null> {
  const key = buildPushReceiptKey(input.userId, input.token);
  const row = await prisma.integrationConfig.findUnique({
    where: { key },
    select: { value: true },
  });

  if (!row) {
    return null;
  }

  const parsed = parsePushReceiptRecord(row.value);
  if (!parsed) {
    return null;
  }

  if (parsed.userId !== input.userId || parsed.token !== input.token) {
    return null;
  }

  return parsed;
}

export async function updatePushReceiptForUser(input: {
  userId: string;
  token: string;
  phase: PushReceiptPhase;
  userAgent?: string;
}) {
  const key = buildPushReceiptKey(input.userId, input.token);
  const existing = await getPushReceiptForUser({ userId: input.userId, token: input.token });
  const nowIso = new Date().toISOString();

  const next: PushReceiptRecord = {
    version: 1,
    userId: input.userId,
    token: input.token,
    sentAt: existing?.sentAt,
    receivedAt: existing?.receivedAt,
    shownAt: existing?.shownAt,
    userAgent: input.userAgent ?? existing?.userAgent,
    updatedAt: nowIso,
  };

  if (input.phase === "sent") {
    next.sentAt = next.sentAt ?? nowIso;
  }

  if (input.phase === "received") {
    next.sentAt = next.sentAt ?? nowIso;
    next.receivedAt = next.receivedAt ?? nowIso;
  }

  if (input.phase === "shown") {
    next.sentAt = next.sentAt ?? nowIso;
    next.receivedAt = next.receivedAt ?? nowIso;
    next.shownAt = next.shownAt ?? nowIso;
  }

  await prisma.integrationConfig.upsert({
    where: { key },
    create: {
      key,
      value: toInputJsonValue(next),
    },
    update: {
      value: toInputJsonValue(next),
    },
  });

  return next;
}
