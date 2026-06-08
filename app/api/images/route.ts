import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuth } from '@/lib/auth';
import { getResolvedConfig, normalizeEndpoint } from '@/lib/user-config';

export const runtime = 'nodejs';

export async function GET() {
  const claims = await getAuth();
  if (!claims) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const images = await prisma.generatedImage.findMany({
    where: { userId: claims.sub },
    orderBy: { createdAt: 'desc' },
    take: 60,
    select: { id: true, prompt: true, model: true, size: true, url: true, b64: true, createdAt: true },
  });

  return NextResponse.json({
    images: images.map((img) => ({
      id: img.id,
      prompt: img.prompt,
      model: img.model,
      size: img.size,
      src: img.url ?? (img.b64 ? `data:image/png;base64,${img.b64}` : null),
      createdAt: img.createdAt.toISOString(),
    })),
  });
}

interface GenBody {
  prompt?: string;
  model?: string;
  size?: string;
  n?: number;
}

interface ImagePayload {
  url?: string;
  b64_json?: string;
}

export async function POST(req: NextRequest) {
  const claims = await getAuth();
  if (!claims) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const config = await getResolvedConfig();
  if (!config) {
    return NextResponse.json({ error: 'Configuration missing. Set up your proxy first.' }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as GenBody;
  const prompt = body.prompt?.trim() ?? '';
  const model = body.model?.trim() ?? '';
  const size = body.size?.trim() || '1024x1024';
  const n = Math.min(Math.max(body.n ?? 1, 1), 4);

  if (!prompt) return NextResponse.json({ error: 'Prompt is required.' }, { status: 400 });
  if (!model) return NextResponse.json({ error: 'Pick an image model.' }, { status: 400 });

  const base = normalizeEndpoint(config.endpoint);
  let upstream: Response;
  try {
    upstream = await fetch(`${base}/images/generations`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ model, prompt, size, n }),
      signal: AbortSignal.timeout(120_000),
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Could not reach the image endpoint.' },
      { status: 502 },
    );
  }

  const text = await upstream.text();
  if (!upstream.ok) {
    let message = `Image generation failed (${upstream.status}).`;
    try {
      const parsed = JSON.parse(text) as { error?: { message?: string } | string };
      const detail = typeof parsed.error === 'string' ? parsed.error : parsed.error?.message;
      if (detail) message = detail;
    } catch {
      /* keep default */
    }
    return NextResponse.json({ error: message, status: upstream.status }, { status: 502 });
  }

  let data: { data?: ImagePayload[] };
  try {
    data = JSON.parse(text) as { data?: ImagePayload[] };
  } catch {
    return NextResponse.json({ error: 'Unexpected response from the image endpoint.' }, { status: 502 });
  }

  const payloads = data.data ?? [];
  if (payloads.length === 0) {
    return NextResponse.json({ error: 'The endpoint returned no images.' }, { status: 502 });
  }

  const created = await prisma.$transaction(
    payloads.map((p) =>
      prisma.generatedImage.create({
        data: {
          userId: claims.sub,
          prompt,
          model,
          size,
          url: p.url ?? null,
          b64: p.b64_json ?? null,
        },
        select: { id: true, prompt: true, model: true, size: true, url: true, b64: true, createdAt: true },
      }),
    ),
  );

  return NextResponse.json({
    images: created.map((img) => ({
      id: img.id,
      prompt: img.prompt,
      model: img.model,
      size: img.size,
      src: img.url ?? (img.b64 ? `data:image/png;base64,${img.b64}` : null),
      createdAt: img.createdAt.toISOString(),
    })),
  });
}
