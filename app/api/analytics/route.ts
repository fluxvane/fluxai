import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuth } from '@/lib/auth';

export const runtime = 'nodejs';

export async function GET() {
  const claims = await getAuth();
  if (!claims) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const userId = claims.sub;

  const now = new Date();
  const DAY_MS = 86_400_000;
  // UTC midnight, 13 days back → 14 day-buckets ending today (inclusive).
  const startMs = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) - 13 * DAY_MS;
  const since = new Date(startMs);

  const [conversationCount, imageCount, roleGroups, modelGroups, tokenAgg, recent] =
    await Promise.all([
      prisma.conversation.count({ where: { userId } }),
      prisma.generatedImage.count({ where: { userId } }),
      prisma.message.groupBy({
        by: ['role'],
        where: { conversation: { userId } },
        _count: { _all: true },
      }),
      prisma.message.groupBy({
        by: ['model'],
        where: { conversation: { userId }, role: 'assistant' },
        _count: { _all: true },
      }),
      prisma.message.aggregate({
        where: { conversation: { userId } },
        _sum: { promptTokens: true, completionTokens: true },
      }),
      prisma.message.findMany({
        where: { conversation: { userId }, createdAt: { gte: since } },
        select: { createdAt: true },
        take: 5000,
      }),
    ]);

  const roleCount = (role: string) =>
    roleGroups.find((g) => g.role === role)?._count._all ?? 0;
  const userMessages = roleCount('user');
  const assistantMessages = roleCount('assistant');
  const totalMessages = roleGroups.reduce((sum, g) => sum + g._count._all, 0);

  const modelUsage = modelGroups
    .filter((g) => g.model)
    .map((g) => ({ model: g.model as string, count: g._count._all }))
    .sort((a, b) => b.count - a.count);

  // 14-day daily activity buckets (UTC).
  const dayBuckets = new Map<string, number>();
  for (let i = 0; i < 14; i++) {
    const key = new Date(startMs + i * DAY_MS).toISOString().slice(0, 10);
    dayBuckets.set(key, 0);
  }
  for (const m of recent) {
    const key = m.createdAt.toISOString().slice(0, 10);
    if (dayBuckets.has(key)) dayBuckets.set(key, (dayBuckets.get(key) ?? 0) + 1);
  }
  const daily = Array.from(dayBuckets.entries()).map(([date, count]) => ({ date, count }));

  return NextResponse.json({
    totals: {
      conversations: conversationCount,
      messages: totalMessages,
      userMessages,
      assistantMessages,
      images: imageCount,
      promptTokens: tokenAgg._sum.promptTokens ?? 0,
      completionTokens: tokenAgg._sum.completionTokens ?? 0,
    },
    modelUsage,
    daily,
  });
}
