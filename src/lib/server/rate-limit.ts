import { NextRequest, NextResponse } from "next/server";

export interface RateLimitOptions {
  maxRequests: number;
  windowMs: number;
}

interface InMemoryBucket {
  count: number;
  resetAt: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

// ---------------------------------------------------------------------------
// In-memory store (fallback / test usage)
// ---------------------------------------------------------------------------

const buckets = new Map<string, InMemoryBucket>();
let lastCleanupAt = 0;
const CLEANUP_INTERVAL_MS = 60_000;

function cleanupExpiredBuckets(now: number): void {
  if (now - lastCleanupAt < CLEANUP_INTERVAL_MS) {
    return;
  }

  lastCleanupAt = now;
  for (const [key, bucket] of buckets.entries()) {
    if (bucket.resetAt <= now) {
      buckets.delete(key);
    }
  }
}

function firstNonEmpty(values: Array<string | null>): string | null {
  for (const value of values) {
    if (value && value.trim()) {
      return value.trim();
    }
  }
  return null;
}

export function getClientAddress(request: NextRequest): string {
  const xForwardedFor = request.headers.get("x-forwarded-for");
  const forwardedIp = xForwardedFor?.split(",")[0]?.trim() || null;

  return (
    firstNonEmpty([
      request.headers.get("cf-connecting-ip"),
      request.headers.get("x-real-ip"),
      forwardedIp,
    ]) ?? "unknown"
  );
}

/**
 * Synchronous in-memory rate limiter.
 * Used directly by tests and as a fallback when the database is unavailable.
 */
export function checkRateLimit(key: string, options: RateLimitOptions): RateLimitResult {
  if (!Number.isInteger(options.maxRequests) || options.maxRequests <= 0) {
    throw new Error("maxRequests must be a positive integer");
  }
  if (!Number.isInteger(options.windowMs) || options.windowMs <= 0) {
    throw new Error("windowMs must be a positive integer");
  }

  const now = Date.now();
  cleanupExpiredBuckets(now);

  const existingBucket = buckets.get(key);
  if (!existingBucket || existingBucket.resetAt <= now) {
    const resetAt = now + options.windowMs;
    buckets.set(key, { count: 1, resetAt });
    return {
      allowed: true,
      remaining: Math.max(options.maxRequests - 1, 0),
      retryAfterSeconds: Math.max(1, Math.ceil((resetAt - now) / 1000)),
    };
  }

  if (existingBucket.count >= options.maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.max(1, Math.ceil((existingBucket.resetAt - now) / 1000)),
    };
  }

  existingBucket.count += 1;
  buckets.set(key, existingBucket);

  return {
    allowed: true,
    remaining: Math.max(options.maxRequests - existingBucket.count, 0),
    retryAfterSeconds: Math.max(1, Math.ceil((existingBucket.resetAt - now) / 1000)),
  };
}

// ---------------------------------------------------------------------------
// PostgreSQL persistent rate limiter
// ---------------------------------------------------------------------------

interface PgBucketRow {
  count: bigint | number;
  resetAt: Date;
}

/**
 * Performs an atomic upsert in PostgreSQL and returns the current bucket state.
 * On any DB error the function throws so the caller can fall back to in-memory.
 */
async function checkRateLimitPg(key: string, options: RateLimitOptions): Promise<RateLimitResult> {
  // Lazy import to avoid breaking test environments without a real DB
  const { default: prisma } = await import("@/lib/server/prisma");

  const now = new Date();
  const resetAt = new Date(now.getTime() + options.windowMs);

  const rows = await prisma.$queryRaw<PgBucketRow[]>`
    INSERT INTO "RateLimitBucket" ("key", "count", "resetAt")
    VALUES (${key}, 1, ${resetAt})
    ON CONFLICT ("key") DO UPDATE
      SET
        "count"   = CASE
                      WHEN "RateLimitBucket"."resetAt" <= NOW() THEN 1
                      ELSE "RateLimitBucket"."count" + 1
                    END,
        "resetAt" = CASE
                      WHEN "RateLimitBucket"."resetAt" <= NOW() THEN ${resetAt}
                      ELSE "RateLimitBucket"."resetAt"
                    END
    RETURNING "count", "resetAt"
  `;

  const row = rows[0];
  if (!row) {
    throw new Error("No row returned from rate-limit upsert");
  }

  const count = typeof row.count === "bigint" ? Number(row.count) : row.count;
  const resetAtMs = row.resetAt.getTime();
  const nowMs = now.getTime();
  const retryAfterSeconds = Math.max(1, Math.ceil((resetAtMs - nowMs) / 1000));

  if (count > options.maxRequests) {
    return { allowed: false, remaining: 0, retryAfterSeconds };
  }

  return {
    allowed: true,
    remaining: Math.max(options.maxRequests - count, 0),
    retryAfterSeconds,
  };
}

/**
 * Persistent rate limiter with automatic in-memory fallback.
 * Prefer this over `checkRateLimit` in production route handlers.
 */
export async function checkRateLimitAsync(
  key: string,
  options: RateLimitOptions,
): Promise<RateLimitResult> {
  if (!Number.isInteger(options.maxRequests) || options.maxRequests <= 0) {
    throw new Error("maxRequests must be a positive integer");
  }
  if (!Number.isInteger(options.windowMs) || options.windowMs <= 0) {
    throw new Error("windowMs must be a positive integer");
  }

  try {
    return await checkRateLimitPg(key, options);
  } catch {
    // DB unavailable — degrade gracefully to in-memory
    return checkRateLimit(key, options);
  }
}

// ---------------------------------------------------------------------------
// Helper: build 429 response
// ---------------------------------------------------------------------------

/**
 * Checks the rate limit for a request and returns a 429 response if exceeded,
 * or null if the request is allowed to proceed.
 * Uses the persistent (PostgreSQL) backend with in-memory fallback.
 */
export async function getRateLimitResponse(
  request: NextRequest,
  keyPrefix: string,
  options: RateLimitOptions,
): Promise<NextResponse | null> {
  const result = await checkRateLimitAsync(
    `${keyPrefix}:${getClientAddress(request)}`,
    options,
  );
  if (!result.allowed) {
    const response = NextResponse.json(
      { message: "Too many requests. Try again later." },
      { status: 429 },
    );
    response.headers.set("Retry-After", String(result.retryAfterSeconds));
    return response;
  }
  return null;
}
