import { describe, it, expect, vi, afterEach } from "vitest";
import {
  rateLimit,
  counterHit,
  counterValue,
  counterClear,
  clientIp,
} from "../lib/rate-limit";
import { NextRequest } from "next/server";

const OLD_ENV = { ...process.env };

afterEach(() => {
  vi.useRealTimers();
  process.env = { ...OLD_ENV };
});

describe("rateLimit", () => {
  it("allows up to the limit then rejects with retryAfter", () => {
    const key = `t:${Math.random()}`;
    for (let i = 0; i < 3; i++) {
      expect(rateLimit(key, 3, 60_000).ok).toBe(true);
    }
    const denied = rateLimit(key, 3, 60_000);
    expect(denied.ok).toBe(false);
    expect(denied.retryAfter).toBeGreaterThan(0);
  });

  it("resets once the window expires", () => {
    vi.useFakeTimers();
    const key = `t:${Math.random()}`;
    expect(rateLimit(key, 1, 1000).ok).toBe(true);
    expect(rateLimit(key, 1, 1000).ok).toBe(false);
    vi.setSystemTime(Date.now() + 1001);
    expect(rateLimit(key, 1, 1000).ok).toBe(true);
  });

  it("tracks keys independently", () => {
    const a = `a:${Math.random()}`;
    const b = `b:${Math.random()}`;
    rateLimit(a, 1, 60_000);
    expect(rateLimit(a, 1, 60_000).ok).toBe(false);
    expect(rateLimit(b, 1, 60_000).ok).toBe(true);
  });
});

describe("failure counters", () => {
  it("increments, reads, and clears", () => {
    const key = `f:${Math.random()}`;
    expect(counterValue(key)).toBe(0);
    counterHit(key, 60_000);
    counterHit(key, 60_000);
    expect(counterValue(key)).toBe(2);
    counterClear(key);
    expect(counterValue(key)).toBe(0);
  });

  it("expires the counter after its window", () => {
    vi.useFakeTimers();
    const key = `f:${Math.random()}`;
    counterHit(key, 1000);
    expect(counterValue(key)).toBe(1);
    vi.setSystemTime(Date.now() + 1001);
    expect(counterValue(key)).toBe(0);
  });
});

describe("clientIp", () => {
  const req = (headers: Record<string, string>) =>
    new NextRequest("http://localhost/api/x", { headers });

  it("ignores spoofed X-Forwarded-For unless TRUST_PROXY_HEADERS=1", () => {
    delete process.env.TRUST_PROXY_HEADERS;
    // No trustworthy IP: callers skip the per-IP check rather than pooling
    // every client into one evadable-or-DoSable shared bucket.
    expect(clientIp(req({ "x-forwarded-for": "1.2.3.4" }))).toBeNull();
    expect(clientIp(req({ "x-real-ip": "1.2.3.4" }))).toBeNull();
  });

  it("honors proxy headers when TRUST_PROXY_HEADERS=1", () => {
    process.env.TRUST_PROXY_HEADERS = "1";
    expect(
      clientIp(req({ "x-forwarded-for": "1.2.3.4, 5.6.7.8" })),
    ).toBe("1.2.3.4");
    expect(clientIp(req({ "x-real-ip": "9.9.9.9" }))).toBe("9.9.9.9");
    expect(clientIp(req({}))).toBeNull();
  });
});
