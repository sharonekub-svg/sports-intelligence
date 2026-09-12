/**
 * Two-tier cache — currently just the in-process tier (a `globalThis`-scoped
 * Map, so it survives warm serverless invocations, per hapogea's proven
 * pattern). A remote tier (Upstash Redis — see .env.example) can be layered
 * in behind this same get/set interface later without touching callers;
 * until then, cold starts simply miss and re-fetch, which is an acceptable
 * degradation, not a correctness issue.
 */

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

declare global {
  var __spiCache: Map<string, CacheEntry<unknown>> | undefined;
}

function store(): Map<string, CacheEntry<unknown>> {
  if (!globalThis.__spiCache) {
    globalThis.__spiCache = new Map();
  }
  return globalThis.__spiCache;
}

export function cacheGet<T>(key: string): T | undefined {
  const entry = store().get(key) as CacheEntry<T> | undefined;
  if (!entry) return undefined;
  if (Date.now() > entry.expiresAt) {
    store().delete(key);
    return undefined;
  }
  return entry.value;
}

export function cacheSet<T>(key: string, value: T, ttlMs: number): void {
  store().set(key, { value, expiresAt: Date.now() + ttlMs });
}

export const CACHE_TTL_MS = {
  oddsHot: 5 * 60 * 1000,
  discovery: 6 * 60 * 60 * 1000,
  standings: 6 * 60 * 60 * 1000,
} as const;
