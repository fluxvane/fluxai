import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyPassword, signToken, setAuthCookie } from '@/lib/auth';

export const runtime = 'nodejs';

interface Body {
  email?: string;
  password?: string;
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as Body;
  const email = body.email?.trim().toLowerCase() ?? '';
  const password = body.password ?? '';

  if (!email || !password) {
    return NextResponse.json({ error: 'Email and password are required.' }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true, name: true, passwordHash: true, config: { select: { id: true } } },
  });

  // Constant-ish failure for both unknown user and bad password.
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return NextResponse.json({ error: 'Invalid email or password.' }, { status: 401 });
  }

  const token = await signToken({ sub: user.id, email: user.email, name: user.name });
  await setAuthCookie(token);

  return NextResponse.json({
    user: { id: user.id, email: user.email, name: user.name },
    hasConfig: !!user.config,
  });
}
