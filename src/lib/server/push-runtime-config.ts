import crypto from "node:crypto";
import { Prisma } from "@prisma/client";
import webpush from "web-push";
import prisma from "@/lib/server/prisma";
import { decryptSecret, encryptSecret } from "@/lib/server/openrouter-secret";
import { assertPushConfiguration, getPushConfigurationStatus, type PushConfiguration } from "@/lib/server/push-config";
import { getSessionSecret } from "@/lib/server/session";

const INTEGRATION_KEY = "push_runtime";

interface PushRuntimeConfigV1 {
  version: 1;
  subject: string;
  publicKey: string;
  encryptedPrivateKey: string;
  cronSecret: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface RuntimePushStatus {
  configured: boolean;
  missing: string[];
  invalid: string[];
  vapidPublicKey: string;
  cronConfigured: boolean;
  source: "env" | "stored" | "none";
}

export interface AutoSetupPushConfigResult {
  generatedPushConfig: boolean;
  generatedCronSecret: boolean;
  vapidPublicKey: string;
  subject: string;
  cronSecret: string | null;
}

function readTrimmed(value: string | undefined): string {
  return typeof value === "string" ? value.trim() : "";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isValidSubject(subject: string): boolean {
  return subject.startsWith("mailto:") || subject.startsWith("https://");
}

function isLikelyVapidKey(value: string): boolean {
  return /^[A-Za-z0-9_-]{16,}$/.test(value);
}

function createDefaultSubject(): string {
  return "mailto:admin@netden.local";
}

function createRandomSecret(size = 32): string {
  return crypto.randomBytes(size).toString("base64url");
}

function parsePushRuntimeConfig(raw: unknown): PushRuntimeConfigV1 | null {
  if (!isRecord(raw)) return null;
  if (raw.version !== 1) return null;
  if (
    typeof raw.subject !== "string" ||
    typeof raw.publicKey !== "string" ||
    typeof raw.encryptedPrivateKey !== "string"
  ) {
    return null;
  }

  const cronSecret =
    raw.cronSecret === null || typeof raw.cronSecret === "string" ? raw.cronSecret : null;
  const createdAt = typeof raw.createdAt === "string" ? raw.createdAt : new Date().toISOString();
  const updatedAt = typeof raw.updatedAt === "string" ? raw.updatedAt : createdAt;

  return {
    version: 1,
    subject: raw.subject,
    publicKey: raw.publicKey,
    encryptedPrivateKey: raw.encryptedPrivateKey,
    cronSecret,
    createdAt,
    updatedAt,
  };
}

async function readStoredPushRuntimeConfig(): Promise<PushRuntimeConfigV1 | null> {
  if (process.env.NODE_ENV === "test") {
    return null;
  }

  try {
    const row = await prisma.integrationConfig.findUnique({
      where: { key: INTEGRATION_KEY },
      select: { value: true },
    });
    if (!row) return null;
    return parsePushRuntimeConfig(row.value);
  } catch {
    return null;
  }
}

async function writeStoredPushRuntimeConfig(value: PushRuntimeConfigV1): Promise<void> {
  const jsonValue = value as unknown as Prisma.InputJsonValue;
  await prisma.integrationConfig.upsert({
    where: { key: INTEGRATION_KEY },
    create: { key: INTEGRATION_KEY, value: jsonValue },
    update: { value: jsonValue },
  });
}

function resolveStoredDeliveryConfig(input: PushRuntimeConfigV1 | null): PushConfiguration | null {
  if (!input) return null;
  if (!isValidSubject(input.subject)) return null;
  if (!isLikelyVapidKey(input.publicKey)) return null;

  try {
    const privateKey = decryptSecret(input.encryptedPrivateKey, getSessionSecret()).trim();
    if (!isLikelyVapidKey(privateKey)) {
      return null;
    }

    return {
      subject: input.subject.trim(),
      publicKey: input.publicKey.trim(),
      privateKey,
    };
  } catch {
    return null;
  }
}

export async function getRuntimePushStatus(): Promise<RuntimePushStatus> {
  const envStatus = getPushConfigurationStatus();
  const envPublicKey = readTrimmed(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY);
  const envCronSecret = readTrimmed(process.env.NETDEN_CRON_SECRET);

  const storedConfig = await readStoredPushRuntimeConfig();
  const storedDeliveryConfig = resolveStoredDeliveryConfig(storedConfig);
  const storedCronSecret = storedConfig?.cronSecret?.trim() ?? "";

  if (envStatus.configured && envPublicKey) {
    return {
      configured: true,
      missing: [],
      invalid: [],
      vapidPublicKey: envPublicKey,
      cronConfigured: Boolean(envCronSecret || storedCronSecret),
      source: "env",
    };
  }

  if (storedDeliveryConfig) {
    return {
      configured: true,
      missing: [],
      invalid: [],
      vapidPublicKey: storedDeliveryConfig.publicKey,
      cronConfigured: Boolean(envCronSecret || storedCronSecret),
      source: "stored",
    };
  }

  return {
    configured: false,
    missing: envStatus.missing,
    invalid: envStatus.invalid,
    vapidPublicKey: "",
    cronConfigured: Boolean(envCronSecret || storedCronSecret),
    source: "none",
  };
}

export async function getRuntimePushDeliveryConfig(): Promise<PushConfiguration> {
  try {
    return assertPushConfiguration();
  } catch {
    const storedConfig = await readStoredPushRuntimeConfig();
    const resolved = resolveStoredDeliveryConfig(storedConfig);
    if (!resolved) {
      throw new Error("Push is not configured");
    }
    return resolved;
  }
}

export async function getRuntimeCronSecret(): Promise<string | null> {
  const envSecret = readTrimmed(process.env.NETDEN_CRON_SECRET);
  if (envSecret) return envSecret;

  const storedConfig = await readStoredPushRuntimeConfig();
  const storedSecret = storedConfig?.cronSecret?.trim() ?? "";
  return storedSecret || null;
}

export async function autoSetupPushRuntimeConfig(input: {
  subject?: string;
} = {}): Promise<AutoSetupPushConfigResult> {
  const envStatus = getPushConfigurationStatus();
  const envCronSecret = readTrimmed(process.env.NETDEN_CRON_SECRET);
  const envDeliveryConfig = envStatus.configured ? assertPushConfiguration() : null;
  const storedBefore = await readStoredPushRuntimeConfig();
  const storedDeliveryBefore = resolveStoredDeliveryConfig(storedBefore);

  let generatedPushConfig = false;
  let generatedCronSecret = false;
  let cronSecretForUi: string | null = null;

  const subjectCandidate = readTrimmed(input.subject) || storedBefore?.subject?.trim() || createDefaultSubject();
  const normalizedSubject = isValidSubject(subjectCandidate) ? subjectCandidate : createDefaultSubject();

  const nowIso = new Date().toISOString();
  let next = storedBefore;

  if (!envStatus.configured && !storedDeliveryBefore) {
    const keys = webpush.generateVAPIDKeys();
    next = {
      version: 1,
      subject: normalizedSubject,
      publicKey: keys.publicKey,
      encryptedPrivateKey: encryptSecret(keys.privateKey, getSessionSecret()),
      cronSecret: storedBefore?.cronSecret?.trim() || null,
      createdAt: storedBefore?.createdAt ?? nowIso,
      updatedAt: nowIso,
    };
    generatedPushConfig = true;
  }

  const hasAnyCronSecret = Boolean(envCronSecret || storedBefore?.cronSecret?.trim());
  if (!hasAnyCronSecret) {
    if (!next) {
      if (storedDeliveryBefore) {
        next = {
          version: 1,
          subject: storedDeliveryBefore.subject,
          publicKey: storedDeliveryBefore.publicKey,
          encryptedPrivateKey: encryptSecret(storedDeliveryBefore.privateKey, getSessionSecret()),
          cronSecret: null,
          createdAt: storedBefore?.createdAt ?? nowIso,
          updatedAt: nowIso,
        };
      } else if (envDeliveryConfig) {
        next = {
          version: 1,
          subject: envDeliveryConfig.subject,
          publicKey: envDeliveryConfig.publicKey,
          encryptedPrivateKey: encryptSecret(envDeliveryConfig.privateKey, getSessionSecret()),
          cronSecret: null,
          createdAt: storedBefore?.createdAt ?? nowIso,
          updatedAt: nowIso,
        };
      }
    }

    if (!next) {
      throw new Error("Auto setup failed: cannot persist cron secret without push config");
    }

    const generatedCron = createRandomSecret();
    cronSecretForUi = generatedCron;
    generatedCronSecret = true;
    next = {
      version: 1,
      subject: next.subject,
      publicKey: next.publicKey,
      encryptedPrivateKey: next.encryptedPrivateKey,
      cronSecret: generatedCron,
      createdAt: next.createdAt,
      updatedAt: nowIso,
    };
  }

  if (next && (generatedPushConfig || generatedCronSecret)) {
    await writeStoredPushRuntimeConfig(next);
  }

  const status = await getRuntimePushStatus();
  if (!status.configured) {
    throw new Error("Auto setup failed: push is still not configured");
  }

  return {
    generatedPushConfig,
    generatedCronSecret,
    vapidPublicKey: status.vapidPublicKey,
    subject: next?.subject ?? normalizedSubject,
    cronSecret: cronSecretForUi,
  };
}
