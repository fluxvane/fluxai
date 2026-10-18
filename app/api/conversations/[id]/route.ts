import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuth } from "@/lib/auth";

export const runtime = "nodejs";

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

// Persisted roles replay verbatim into upstream chat history — anything else
// is junk or an injection vector. Content is capped so the sync endpoint
// can't be used as a large-object store.
const VALID_ROLES = new Set(["user", "assistant", "system"]);
const MAX_MESSAGES = 500;
const MAX_CONTENT_CHARS = 64_000;
const MAX_REASONING_CHARS = 256_000;

async function ownConversation(userId: string, id: string) {
  const conv = await prisma.conversation.findUnique({
    where: { id },
    select: { userId: true },
  });
  if (!conv || conv.userId !== userId) return false;
  return true;
}

export async function GET(_req: NextRequest, { params }: Ctx) {
  const claims = await getAuth();
  if (!claims)
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
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
        orderBy: { createdAt: "asc" },
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
    return NextResponse.json({ error: "not_found" }, { status: 404 });
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
  if (!claims)
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;
  if (!(await ownConversation(claims.sub, id))) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const body = (await req.json().catch(() => ({}))) as SyncBody;
  const incoming = Array.isArray(body.messages) ? body.messages : [];

  // Reject rather than sanitize: silently dropping invalid roles or slicing
  // over-length content means the client believes data was saved that
  // wasn't — reopening the conversation loses it without any error shown.
  if (incoming.length > MAX_MESSAGES) {
    return NextResponse.json(
      { error: `Too many messages (max ${MAX_MESSAGES}).` },
      { status: 400 },
    );
  }
  const messages: IncomingMessage[] = [];
  for (const [i, m] of incoming.entries()) {
    if (
      m == null ||
      typeof m !== "object" ||
      !VALID_ROLES.has(m.role) ||
      typeof m.content !== "string"
    ) {
      return NextResponse.json(
        { error: `Message ${i} has an unsupported role or missing content.` },
        { status: 400 },
      );
    }
    if (m.content.length > MAX_CONTENT_CHARS) {
      return NextResponse.json(
        {
          error: `Message ${i} content exceeds ${MAX_CONTENT_CHARS} characters.`,
        },
        { status: 400 },
      );
    }
    if (typeof m.reasoning === "string" && m.reasoning.length > MAX_REASONING_CHARS) {
      return NextResponse.json(
        {
          error: `Message ${i} reasoning exceeds ${MAX_REASONING_CHARS} characters.`,
        },
        { status: 400 },
      );
    }
    messages.push(m);
  }

  const data: { title?: string } = {};
  if (body.title?.trim()) data.title = body.title.trim().slice(0, 120);

  await prisma.$transaction([
    prisma.message.deleteMany({ where: { conversationId: id } }),
    prisma.message.createMany({
      data: messages.map((m) => ({
        conversationId: id,
        role: m.role,
        content: m.content,
        reasoning: typeof m.reasoning === "string" ? m.reasoning : null,
        model: typeof m.model === "string" ? m.model.slice(0, 200) : null,
        promptTokens:
          typeof m.promptTokens === "number" ? Math.trunc(m.promptTokens) : null,
        completionTokens:
          typeof m.completionTokens === "number"
            ? Math.trunc(m.completionTokens)
            : null,
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
  if (!claims)
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;
  if (!(await ownConversation(claims.sub, id))) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  await prisma.conversation.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
