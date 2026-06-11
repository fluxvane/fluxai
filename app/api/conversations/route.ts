import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuth } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET() {
  const claims = await getAuth();
  if (!claims)
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const conversations = await prisma.conversation.findMany({
    where: { userId: claims.sub },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      title: true,
      model: true,
      updatedAt: true,
      _count: { select: { messages: true } },
    },
    take: 100,
  });

  return NextResponse.json({
    conversations: conversations.map((c) => ({
      id: c.id,
      title: c.title,
      model: c.model,
      updatedAt: c.updatedAt,
      messageCount: c._count.messages,
    })),
  });
}

interface CreateBody {
  title?: string;
  model?: string;
}

export async function POST(req: NextRequest) {
  const claims = await getAuth();
  if (!claims)
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as CreateBody;
  const title = (body.title?.trim() || "New chat").slice(0, 120);
  const model = body.model?.trim() || "chat";

  const conversation = await prisma.conversation.create({
    data: { userId: claims.sub, title, model },
    select: { id: true, title: true, model: true, updatedAt: true },
  });

  return NextResponse.json({ conversation });
}
