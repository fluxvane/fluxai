import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuth } from '@/lib/auth';

export const runtime = 'nodejs';

type Ctx = { params: Promise<{ id: string }> };

interface IncomingMessage {
  role: string;
  content: string;
  reasoning?: string | null;
  model?: string | null;
  promptTokens?: number | null;
  completionTokens?: number | null;
}

interface SyncBody {
  title?: string;
  messages?: IncomingMessage[];
}

async function ownConversation(userId: string, id: string) {
  const conv = await prisma.conversation.findUnique({ where: { id }, select: { userId: true } });
  if (!conv || conv.userId !== userId) return false;
  return true;
}

export async function GET(_req: NextRequest, { params }: Ctx) {
  const claims = await getAuth();
  if (!claims) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;

  const conversation = await prisma.conversation.findUnique({
    where: { id },
    select: {
      id: true,
      userId: true,
      title: true,
      model: true,
      updatedAt: true,
      messages: {
        orderBy: { createdAt: 'asc' },
        select: {
          id: true,
          role: true,
          content: true,
          reasoning: true,
          model: true,
          createdAt: true,
        },
      },
    },
  });

  if (!conversation || conversation.userId !== claims.sub) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  return NextResponse.json({
    conversation: {
      id: conversation.id,
      title: conversation.title,
      model: conversation.model,
      updatedAt: conversation.updatedAt,
      messages: conversation.messages.map((m) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        reasoning: m.reasoning ?? undefined,
        model: m.model ?? undefined,
        createdAt: m.createdAt.toISOString(),
      })),
    },
  });
}

// Replace the conversation's messages (and optionally title). Atomic.
export async function PUT(req: NextRequest, { params }: Ctx) {
  const claims = await getAuth();
  if (!claims) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;
  if (!(await ownConversation(claims.sub, id))) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  const body = (await req.json().catch(() => ({}))) as SyncBody;
  const messages = Array.isArray(body.messages) ? body.messages.slice(0, 500) : [];

  const data: { title?: string } = {};
  if (body.title?.trim()) data.title = body.title.trim().slice(0, 120);

  await prisma.$transaction([
    prisma.message.deleteMany({ where: { conversationId: id } }),
    prisma.message.createMany({
      data: messages.map((m) => ({
        conversationId: id,
        role: m.role,
        content: m.content,
        reasoning: m.reasoning ?? null,
        model: m.model ?? null,
        promptTokens: m.promptTokens ?? null,
        completionTokens: m.completionTokens ?? null,
      })),
    }),
    prisma.conversation.update({
      where: { id },
      data: { ...data, updatedAt: new Date() },
    }),
  ]);

  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const claims = await getAuth();
  if (!claims) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;
  if (!(await ownConversation(claims.sub, id))) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  await prisma.conversation.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
