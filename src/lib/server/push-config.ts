export interface PushConfigurationStatus {
  configured: boolean;
  missing: string[];
  invalid: string[];
}

export interface PushConfiguration {
  subject: string;
  publicKey: string;
  privateKey: string;
}

const REQUIRED_FIELDS = [
  "VAPID_SUBJECT",
  "NEXT_PUBLIC_VAPID_PUBLIC_KEY",
  "VAPID_PRIVATE_KEY",
] as const;

function readTrimmed(value: string | undefined): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const normalized = value.trim();
  return normalized ? normalized : null;
}

function isValidSubject(subject: string): boolean {
  return subject.startsWith("mailto:") || subject.startsWith("https://");
}

function isLikelyVapidKey(value: string): boolean {
  return /^[A-Za-z0-9_-]{16,}$/.test(value);
}

export class PushConfigurationError extends Error {
  readonly missing: string[];
  readonly invalid: string[];

  constructor(input: { missing: string[]; invalid: string[] }) {
    const parts: string[] = ["Push is not configured"];
    if (input.missing.length > 0) {
      parts.push(`missing: ${input.missing.join(", ")}`);
    }
    if (input.invalid.length > 0) {
      parts.push(`invalid: ${input.invalid.join(", ")}`);
    }

    super(parts.join("; "));
    this.name = "PushConfigurationError";
    this.missing = input.missing;
    this.invalid = input.invalid;
  }
}

export function getPushConfigurationStatus(
  env: Partial<Record<string, string | undefined>> = process.env,
): PushConfigurationStatus {
  const subject = readTrimmed(env.VAPID_SUBJECT);
  const publicKey = readTrimmed(env.NEXT_PUBLIC_VAPID_PUBLIC_KEY);
  const privateKey = readTrimmed(env.VAPID_PRIVATE_KEY);

  const missing: string[] = [];
  for (const field of REQUIRED_FIELDS) {
    if (!readTrimmed(env[field])) {
      missing.push(field);
    }
  }

  const invalid: string[] = [];
  if (subject && !isValidSubject(subject)) {
    invalid.push("VAPID_SUBJECT");
  }
  if (publicKey && !isLikelyVapidKey(publicKey)) {
    invalid.push("NEXT_PUBLIC_VAPID_PUBLIC_KEY");
  }
  if (privateKey && !isLikelyVapidKey(privateKey)) {
    invalid.push("VAPID_PRIVATE_KEY");
  }

  return {
    configured: missing.length === 0 && invalid.length === 0,
    missing,
    invalid,
  };
}

export function assertPushConfiguration(
  env: Partial<Record<string, string | undefined>> = process.env,
): PushConfiguration {
  const subject = readTrimmed(env.VAPID_SUBJECT);
  const publicKey = readTrimmed(env.NEXT_PUBLIC_VAPID_PUBLIC_KEY);
  const privateKey = readTrimmed(env.VAPID_PRIVATE_KEY);

  const status = getPushConfigurationStatus(env);
  if (!status.configured || !subject || !publicKey || !privateKey) {
    throw new PushConfigurationError({
      missing: status.missing,
      invalid: status.invalid,
    });
  }

  return {
    subject,
    publicKey,
    privateKey,
  };
}
