import type { NextRequest } from "next/server";

/**
 * In-memory fixed-window rate limiting for a single-instance deployment.
 * Good enough to blunt credential stuffing, register spam, and proxy cost
 * amplification. If the app is ever scaled past one instance, swap the Map
 * for Redis/Upstash — the call sites stay the same.
 */

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();
let hits = 0;

function prune(now: number): void {
  // Bound memory: sweep expired buckets occasionally instead of on every hit.
  if (++hits % 512 !== 0 && buckets.size < 4096) return;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

/**
 * Increments `key` for the current window. Returns whether the caller is
 * within `limit`, and seconds until the window resets when rejected.
 */
export function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
): { ok: boolean; retryAfter: number } {
  const now = Date.now();
  prune(now);
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, retryAfter: 0 };
  }
  bucket.count += 1;
  if (bucket.count > limit) {
    return { ok: false, retryAfter: Math.ceil((bucket.resetAt - now) / 1000) };
  }
  return { ok: true, retryAfter: 0 };
}

/** Read a counter without incrementing it (e.g. check-then-verify flows). */
export function counterValue(key: string): number {
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= Date.now()) return 0;
  return bucket.count;
}

/** Increment a counter, creating/resetting its window as needed. */
export function counterHit(key: string, windowMs: number): void {
  const now = Date.now();
  prune(now);
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return;
  }
  bucket.count += 1;
}

export function counterClear(key: string): void {
  buckets.delete(key);
}

/**
 * Best-effort client IP for per-IP limits.
 *
 * x-forwarded-for / x-real-ip are only honored when TRUST_PROXY_HEADERS=1 —
 * i.e. the deployment sits behind a proxy that *overwrites* those headers
 * (nginx, Vercel, a load balancer). Without that opt-in a client can send
 * arbitrary XFF values and rotate them to evade the per-IP limits, so all
 * clients share the "unknown" bucket — fail-closed, never evadable.
 */
export function clientIp(req: NextRequest): string {
  if (process.env.TRUST_PROXY_HEADERS === "1") {
    const forwarded = req.headers.get("x-forwarded-for");
    if (forwarded) return forwarded.split(",")[0].trim() || "unknown";
    const real = req.headers.get("x-real-ip")?.trim();
    if (real) return real;
  }
  return "unknown";
}
