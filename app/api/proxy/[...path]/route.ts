import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const COOKIE_NAME = 'flux_ai_proxy';

interface ProxySettings {
  endpoint: string;
  apiKey: string;
}

async function readSettings(): Promise<ProxySettings | null> {
  const store = await cookies();
  const raw = store.get(COOKIE_NAME)?.value;
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as ProxySettings;
    if (!parsed.endpoint || !parsed.apiKey) return null;
    return parsed;
  } catch {
    return null;
  }
}

async function proxy(req: NextRequest, path: string[]) {
  const settings = await readSettings();
  if (!settings) {
    return NextResponse.json(
      { error: 'not_configured', message: 'No proxy credentials in cookie' },
      { status: 401 },
    );
  }

  const base = settings.endpoint.replace(/\/+$/, '');
  const url = `${base}/${path.join('/')}${req.nextUrl.search}`;

  const init: RequestInit = {
    method: req.method,
    headers: {
      Authorization: `Bearer ${settings.apiKey}`,
      'Content-Type': req.headers.get('content-type') ?? 'application/json',
    },
  };

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    init.body = await req.text();
  }

  try {
    const upstream = await fetch(url, init);

    if (path[0] === 'chat' && path[1] === 'completions' && upstream.body) {
      const headers = new Headers();
      headers.set('Content-Type', upstream.headers.get('content-type') ?? 'text/event-stream');
      headers.set('Cache-Control', 'no-cache, no-transform');
      headers.set('Connection', 'keep-alive');
      headers.set('X-Accel-Buffering', 'no');
      return new Response(upstream.body, { status: upstream.status, headers });
    }

    const contentType = upstream.headers.get('content-type') ?? 'application/json';
    const body = await upstream.text();
    return new NextResponse(body, {
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

export async function GET(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  return proxy(req, path);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  return proxy(req, path);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  return proxy(req, path);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  return proxy(req, path);
}
