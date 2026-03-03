import crypto from "node:crypto";
import { NextRequest } from "next/server";
import { AuthUser } from "@/lib/types";

export const SESSION_COOKIE_NAME = "netden_session";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

type SessionSecretMode =
  | "configured"
  | "derived-short"
  | "derived-from-database-url"
  | "derived-insecure-default";

let warnedSessionMode: SessionSecretMode | null = null;

export interface SessionPayload {
  userId: string;
  email: string;
  iat: number;
  exp: number;
  jti?: string;
}

function base64UrlEncode(value: string): string {
  return Buffer.from(value, "utf8").toString("base64url");
}

function base64UrlDecode(value: string): string {
  return Buffer.from(value, "base64url").toString("utf8");
}

function deriveStableSecret(seed: string): string {
  return crypto.createHash("sha256").update(seed).digest("hex");
}

function resolveSessionSecret(): {
  secret: string;
  mode: SessionSecretMode;
  configured: boolean;
  strong: boolean;
  length: number;
} {
  const raw = process.env.NETDEN_SESSION_SECRET?.trim() ?? "";
  if (raw.length >= 32) {
    return {
      secret: raw,
      mode: "configured",
      configured: true,
      strong: true,
      length: raw.length,
    };
  }

  if (raw.length > 0) {
    return {
      secret: deriveStableSecret(`netden:short:${raw}`),
      mode: "derived-short",
      configured: true,
      strong: false,
      length: raw.length,
    };
  }

  const databaseUrl = process.env.DATABASE_URL?.trim() ?? "";
  if (databaseUrl) {
    return {
      secret: deriveStableSecret(`netden:database:${databaseUrl}`),
      mode: "derived-from-database-url",
      configured: false,
      strong: false,
      length: 0,
    };
  }

  return {
    secret: deriveStableSecret("netden:insecure-default-session-secret"),
    mode: "derived-insecure-default",
    configured: false,
    strong: false,
    length: 0,
  };
}

function getSessionSecret(): string {
  const resolved = resolveSessionSecret();

  if (resolved.mode !== "configured" && warnedSessionMode !== resolved.mode) {
    warnedSessionMode = resolved.mode;
    if (resolved.mode === "derived-short") {
      console.warn(
        "NETDEN_SESSION_SECRET is shorter than 32 characters. Using SHA-256 derived secret.",
      );
    } else if (resolved.mode === "derived-from-database-url") {
      console.warn(
        "NETDEN_SESSION_SECRET is missing. Using secret derived from DATABASE_URL.",
      );
    } else {
      console.warn(
        "NETDEN_SESSION_SECRET and DATABASE_URL are missing. Using insecure fallback secret.",
      );
    }
  }

  return resolved.secret;
}

export function getSessionSecretHealth() {
  const resolved = resolveSessionSecret();
  return {
    configured: resolved.configured,
    strong: resolved.strong,
    length: resolved.length,
    mode: resolved.mode,
  };
}

function sign(value: string, secret: string): string {
  return crypto.createHmac("sha256", secret).update(value).digest("base64url");
}

/** SHA-256 hash of the raw token string, used as the whitelist key. */
export function hashSessionToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function createSessionToken(user: Pick<AuthUser, "id" | "email">): string {
  const now = Math.floor(Date.now() / 1000);
  const payload: SessionPayload = {
    userId: user.id,
    email: user.email,
    iat: now,
    exp: now + SESSION_MAX_AGE_SECONDS,
    jti: crypto.randomUUID(),
  };

  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const secret = getSessionSecret();
  const signature = sign(encodedPayload, secret);
  return `${encodedPayload}.${signature}`;
}

export function verifySessionToken(token: string | undefined): SessionPayload | null {
  if (!token) {
    return null;
  }

  const [encodedPayload, providedSignature] = token.split(".");
  if (!encodedPayload || !providedSignature) {
    return null;
  }

  let secret: string;
  try {
    secret = getSessionSecret();
  } catch {
    return null;
  }

  const expectedSignature = sign(encodedPayload, secret);
  const expectedBuffer = Buffer.from(expectedSignature);
  const providedBuffer = Buffer.from(providedSignature);

  if (
    expectedBuffer.length !== providedBuffer.length ||
    !crypto.timingSafeEqual(expectedBuffer, providedBuffer)
  ) {
    return null;
  }

  try {
    const payload = JSON.parse(base64UrlDecode(encodedPayload)) as SessionPayload;
    if (!payload.userId || !payload.email || !payload.exp) {
      return null;
    }

    const now = Math.floor(Date.now() / 1000);
    if (payload.exp <= now) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

export function getSessionFromRequest(request: NextRequest): SessionPayload | null {
  return verifySessionToken(request.cookies.get(SESSION_COOKIE_NAME)?.value);
}

export const sessionCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: SESSION_MAX_AGE_SECONDS,
};

// ---------------------------------------------------------------------------
// DB persistence helpers (session whitelist)
// ---------------------------------------------------------------------------

/**
 * Saves a newly created token to the Session whitelist in PostgreSQL.
 * Falls back silently if the database is unavailable.
 */
export async function persistSessionToken(
  token: string,
  userId: string,
  expiresAt: Date,
): Promise<void> {
  try {
    const { default: prisma } = await import("@/lib/server/prisma");
    await prisma.session.create({
      data: {
        userId,
        tokenHash: hashSessionToken(token),
        expiresAt,
      },
    });
  } catch {
    // DB unavailable — degrade gracefully
  }
}

/**
 * Removes a token from the Session whitelist (logout / revocation).
 * Falls back silently if the database is unavailable.
 */
export async function revokeSessionToken(token: string): Promise<void> {
  try {
    const { default: prisma } = await import("@/lib/server/prisma");
    await prisma.session.deleteMany({
      where: { tokenHash: hashSessionToken(token) },
    });
  } catch {
    // DB unavailable — ignore
  }
}

/**
 * Returns true if the token hash exists in the whitelist (not revoked, not expired).
 * Returns true on DB error to prevent lockout when the database is down.
 */
export async function isSessionActive(tokenHash: string): Promise<boolean> {
  try {
    const { default: prisma } = await import("@/lib/server/prisma");
    const session = await prisma.session.findUnique({
      where: { tokenHash },
      select: { expiresAt: true },
    });
    if (!session) return false;
    return session.expiresAt > new Date();
  } catch {
    // DB unavailable — allow request to proceed (fail open)
    return true;
  }
}

/**
 * Periodically cleans up expired sessions.
 * Called opportunistically — not required for correctness.
 */
export async function pruneExpiredSessions(): Promise<void> {
  try {
    const { default: prisma } = await import("@/lib/server/prisma");
    await prisma.session.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    });
  } catch {
    // ignore
  }
}
