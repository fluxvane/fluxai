import { NextRequest, NextResponse } from 'next/server';

const COOKIE_NAME = 'flux_ai_proxy';

interface Body {
  endpoint?: string;
  apiKey?: string;
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as Body;
  if (!body.endpoint || !body.apiKey) {
    return NextResponse.json(
      { error: 'missing_fields', message: 'endpoint and apiKey are required' },
      { status: 400 },
    );
  }

  const value = JSON.stringify({ endpoint: body.endpoint, apiKey: body.apiKey });
  const isSecure = process.env.NODE_ENV === 'production' || req.url.startsWith('https://');

  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE_NAME, value, {
    httpOnly: true,
    secure: isSecure,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  });
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.delete(COOKIE_NAME);
  return res;
}
