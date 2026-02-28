import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";

const VERSION = "v1";
const ALGO = "aes-256-gcm";

function toBase64Url(value: Buffer): string {
  return value.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function fromBase64Url(value: string): Buffer {
  const padded = value + "=".repeat((4 - (value.length % 4)) % 4);
  return Buffer.from(padded.replace(/-/g, "+").replace(/_/g, "/"), "base64");
}

function deriveKey(secret: string): Buffer {
  return createHash("sha256").update(secret, "utf8").digest();
}

export function getOpenRouterEncryptionSecret(
  env: Partial<Record<string, string | undefined>> = process.env,
): string {
  const secret = env.OPENROUTER_KEY_ENCRYPTION_SECRET?.trim() || env.NETDEN_SESSION_SECRET?.trim();
  if (!secret) {
    throw new Error("Missing OPENROUTER_KEY_ENCRYPTION_SECRET/NETDEN_SESSION_SECRET");
  }
  return secret;
}

export function encryptSecret(plainText: string, secret: string): string {
  if (!plainText.trim()) {
    throw new Error("Secret value is empty");
  }
  if (!secret.trim()) {
    throw new Error("Encryption secret is empty");
  }

  const iv = randomBytes(12);
  const key = deriveKey(secret);
  const cipher = createCipheriv(ALGO, key, iv);
  const encrypted = Buffer.concat([cipher.update(plainText, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return [VERSION, toBase64Url(iv), toBase64Url(encrypted), toBase64Url(tag)].join(":");
}

export function decryptSecret(encoded: string, secret: string): string {
  const [version, ivRaw, encryptedRaw, tagRaw] = encoded.split(":");
  if (version !== VERSION || !ivRaw || !encryptedRaw || !tagRaw) {
    throw new Error("Invalid encrypted secret format");
  }
  if (!secret.trim()) {
    throw new Error("Encryption secret is empty");
  }

  const key = deriveKey(secret);
  const iv = fromBase64Url(ivRaw);
  const encrypted = fromBase64Url(encryptedRaw);
  const tag = fromBase64Url(tagRaw);

  const decipher = createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(tag);
  const plain = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return plain.toString("utf8");
}

export function maskOpenRouterKey(key: string): string {
  const normalized = key.trim();
  if (normalized.length <= 8) {
    return "••••";
  }

  const tail = normalized.slice(-4);
  const prefixMatch = normalized.match(/^[^-]+-[^-]+-[^-]+/);
  const prefix = prefixMatch ? prefixMatch[0] : normalized.slice(0, 4);

  return `${prefix}…${tail}`;
}
