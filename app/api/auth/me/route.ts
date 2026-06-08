import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuth } from '@/lib/auth';

export const runtime = 'nodejs';

export async function GET() {
  const claims = await getAuth();
  if (!claims) {
    return NextResponse.json({ user: null }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: claims.sub },
    select: {
      id: true,
      email: true,
      name: true,
      config: { select: { endpoint: true, defaultModel: true } },
    },
  });

  if (!user) {
    return NextResponse.json({ user: null }, { status: 401 });
  }

  return NextResponse.json({
    user: { id: user.id, email: user.email, name: user.name },
    hasConfig: !!user.config,
    config: user.config
      ? { endpoint: user.config.endpoint, defaultModel: user.config.defaultModel }
      : null,
  });
}
