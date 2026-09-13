import "server-only";

/**
 * In-memory token-bucket rate limiter. Per-instance only (a
 * `globalThis`-scoped Map, same survives-warm-invocations pattern as
 * lib/providers/cache.ts) — on Vercel's serverless model this is
 * best-effort, not a hard distributed guarantee, since concurrent cold
 * instances don't share state. Upstash Redis (see UPSTASH_REDIS_REST_URL
 * in .env.example) is the documented upgrade path for a real distributed
 * limit; this module's function signature is designed to be swapped for
 * a Redis-backed version without touching call sites.
 */

interface Bucket {
  count: number;
  resetAt: number;
}

declare global {
  var __spiRateLimitBuckets: Map<string, Bucket> | undefined;
}

function store(): Map<string, Bucket> {
  if (!globalThis.__spiRateLimitBuckets) {
    globalThis.__spiRateLimitBuckets = new Map();
  }
  return globalThis.__spiRateLimitBuckets;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

export function checkRateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  const buckets = store();
  const bucket = buckets.get(key);

  if (!bucket || now > bucket.resetAt) {
    const resetAt = now + windowMs;
    buckets.set(key, { count: 1, resetAt });
    return { allowed: true, remaining: limit - 1, resetAt };
  }

  if (bucket.count >= limit) {
    return { allowed: false, remaining: 0, resetAt: bucket.resetAt };
  }

  bucket.count++;
  return { allowed: true, remaining: limit - bucket.count, resetAt: bucket.resetAt };
}

/** Best-effort client identifier for anonymous/pre-auth requests. */
export function getClientIp(request: Request): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0].trim();
  return request.headers.get("x-real-ip") ?? "unknown";
}
