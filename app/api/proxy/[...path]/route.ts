import { NextRequest, NextResponse } from 'next/server';
import { getResolvedConfig, normalizeEndpoint } from '@/lib/user-config';

export const runtime = 'nodejs';

async function proxy(req: NextRequest, path: string[]) {
  const config = await getResolvedConfig();
  if (!config) {
    return NextResponse.json(
      { error: 'not_configured', message: 'Sign in and complete configuration first.' },
      { status: 401 },
    );
  }

  const base = normalizeEndpoint(config.endpoint);
  const url = `${base}/${path.join('/')}${req.nextUrl.search}`;

  const init: RequestInit = {
    method: req.method,
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      'Content-Type': req.headers.get('content-type') ?? 'application/json',
    },
  };

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    init.body = await req.text();
  }

  try {
    const upstream = await fetch(url, init);

    // Stream chat completions straight through (SSE).
    const isChatStream = path[0] === 'chat' && path[1] === 'completions' && upstream.body;
    if (isChatStream) {
      const headers = new Headers();
      headers.set('Content-Type', upstream.headers.get('content-type') ?? 'text/event-stream');
      headers.set('Cache-Control', 'no-cache, no-transform');
      headers.set('Connection', 'keep-alive');
      headers.set('X-Accel-Buffering', 'no');
      return new Response(upstream.body, { status: upstream.status, headers });
    }

    const contentType = upstream.headers.get('content-type') ?? 'application/json';
    const bodyText = await upstream.text();
    return new NextResponse(bodyText, {
      status: upstream.status,
      headers: { 'Content-Type': contentType },
    });
  } catch (err) {
    return NextResponse.json(
      { error: 'upstream_error', message: err instanceof Error ? err.message : 'fetch failed' },
      { status: 502 },
    );
  }
}

type Ctx = { params: Promise<{ path: string[] }> };

export async function GET(req: NextRequest, { params }: Ctx) {
  return proxy(req, (await params).path);
}
export async function POST(req: NextRequest, { params }: Ctx) {
  return proxy(req, (await params).path);
}
export async function PUT(req: NextRequest, { params }: Ctx) {
  return proxy(req, (await params).path);
}
export async function DELETE(req: NextRequest, { params }: Ctx) {
  return proxy(req, (await params).path);
}
