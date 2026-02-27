import { NextRequest, NextResponse } from "next/server";

interface RateLimitOptions {
  maxRequests: number;
  windowMs: number;
}

interface RateLimitBucket {
  count: number;
  resetAt: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

const buckets = new Map<string, RateLimitBucket>();
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

/**
 * Checks the rate limit for a request and returns a 429 response if exceeded,
 * or null if the request is allowed to proceed.
 */
export function getRateLimitResponse(
  request: NextRequest,
  keyPrefix: string,
  options: RateLimitOptions,
): NextResponse | null {
  const result = checkRateLimit(`${keyPrefix}:${getClientAddress(request)}`, options);
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
