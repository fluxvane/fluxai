import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword, signToken, setAuthCookie } from "@/lib/auth";
import { clientIp, rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

interface Body {
  email?: string;
  password?: string;
  name?: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: NextRequest) {
  // Per-IP cap on account creation (spam / DB-bloat / enumeration abuse).
  // Skipped when no trusted proxy supplies a real IP — a shared bucket
  // would let one attacker throttle registration for everyone.
  const ip = clientIp(req);
  if (ip) {
    const limited = rateLimit(`register-ip:${ip}`, 10, 5 * 60_000);
    if (!limited.ok) {
      return NextResponse.json(
        { error: "Too many attempts. Try again later." },
        { status: 429, headers: { "Retry-After": String(limited.retryAfter) } },
      );
    }
  }

  const body = (await req.json().catch(() => ({}))) as Body;
  const email = body.email?.trim().toLowerCase() ?? "";
  const name = body.name?.trim() ?? "";
  const password = body.password ?? "";

  if (!email || !password || !name) {
    return NextResponse.json(
      { error: "All fields are required." },
      { status: 400 },
    );
  }
  if (!EMAIL_RE.test(email)) {
    return NextResponse.json(
      { error: "Please enter a valid email address." },
      { status: 400 },
    );
  }
  if (password.length < 8) {
    return NextResponse.json(
      { error: "Password must be at least 8 characters." },
      { status: 400 },
    );
  }

  // Hash before the existence check so a duplicate-email response takes the
  // same ~100ms as a successful registration — otherwise timing reveals which
  // emails are registered.
  const passwordHash = await hashPassword(password);

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    // Generic message: confirming "this email is registered" in-band is an
    // enumeration vector. (Per-IP and per-window limits above blunt bulk use.)
    return NextResponse.json(
      {
        error:
          "Could not create an account with this email. If you registered before, sign in instead.",
      },
      { status: 409 },
    );
  }
  const user = await prisma.user.create({
    data: { email, name, passwordHash },
    select: { id: true, email: true, name: true },
  });

  const token = await signToken({
    sub: user.id,
    email: user.email,
    name: user.name,
  });
  await setAuthCookie(token);

  return NextResponse.json({ user, hasConfig: false });
}
