import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPassword, signToken, setAuthCookie } from "@/lib/auth";
import {
  clientIp,
  counterClear,
  counterHit,
  counterValue,
  rateLimit,
} from "@/lib/rate-limit";

export const runtime = "nodejs";

interface Body {
  email?: string;
  password?: string;
}

// A real bcrypt hash of a random string, used so unknown-email logins pay the
// same ~100ms compare cost as known-email ones — otherwise response timing
// reveals which accounts exist.
const DUMMY_HASH = "$2b$10$qIT.36DNVdLHoQvcPfu3FugoY0C6tAPRPC4Pl/HQpJW7QNLsiAYqK";

const IP_LIMIT = { requests: 15, windowMs: 60_000 };
const ACCOUNT_LIMIT = 10;
const ACCOUNT_WINDOW_MS = 5 * 60_000;

function tooManyRequests(retryAfter: number) {
  return NextResponse.json(
    { error: "Too many attempts. Try again later." },
    { status: 429, headers: { "Retry-After": String(retryAfter) } },
  );
}

export async function POST(req: NextRequest) {
  // Per-IP limit only when a trusted proxy supplies a real client IP.
  // Without one there is no trustworthy identity to bucket on — pooling
  // all visitors into a shared cap would let one attacker block everyone's
  // sign-ins. The per-account lockout below is the real brute-force guard;
  // rotating emails doesn't evade it, since each account caps separately.
  const ip = clientIp(req);
  if (ip) {
    const limited = rateLimit(
      `login-ip:${ip}`,
      IP_LIMIT.requests,
      IP_LIMIT.windowMs,
    );
    if (!limited.ok) return tooManyRequests(limited.retryAfter);
  }

  const body = (await req.json().catch(() => ({}))) as Body;
  const email = body.email?.trim().toLowerCase() ?? "";
  const password = body.password ?? "";

  if (!email || !password) {
    return NextResponse.json(
      { error: "Email and password are required." },
      { status: 400 },
    );
  }

  const failKey = `login-fail:${email}`;
  if (counterValue(failKey) >= ACCOUNT_LIMIT) {
    return tooManyRequests(Math.ceil(ACCOUNT_WINDOW_MS / 1000));
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      name: true,
      passwordHash: true,
      config: { select: { endpoint: true, defaultModel: true } },
    },
  });

  // Always run bcrypt — including for unknown emails — so the two failure
  // paths take the same time and don't leak account existence via timing.
  const passwordOk = await verifyPassword(
    password,
    user?.passwordHash ?? DUMMY_HASH,
  );
  if (!user || !passwordOk) {
    counterHit(failKey, ACCOUNT_WINDOW_MS);
    return NextResponse.json(
      { error: "Invalid email or password." },
      { status: 401 },
    );
  }
  counterClear(failKey);

  const token = await signToken({
    sub: user.id,
    email: user.email,
    name: user.name,
  });
  await setAuthCookie(token);

  return NextResponse.json({
    user: { id: user.id, email: user.email, name: user.name },
    hasConfig: !!user.config,
    config: user.config,
  });
}
