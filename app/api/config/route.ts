import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuth } from '@/lib/auth';
import { normalizeEndpoint, probeProxy } from '@/lib/user-config';

export const runtime = 'nodejs';

interface Body {
  endpoint?: string;
  apiKey?: string;
  defaultModel?: string;
}

export async function GET() {
  const claims = await getAuth();
  if (!claims) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const config = await prisma.config.findUnique({ where: { userId: claims.sub } });
  if (!config) return NextResponse.json({ config: null });

  // Never return the raw apiKey to the client.
  return NextResponse.json({
    config: {
      endpoint: config.endpoint,
      defaultModel: config.defaultModel,
      hasApiKey: !!config.apiKey,
    },
  });
}

export async function POST(req: NextRequest) {
  const claims = await getAuth();
  if (!claims) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as Body;
  const endpoint = normalizeEndpoint(body.endpoint ?? '');
  const apiKey = body.apiKey?.trim() ?? '';
  const defaultModel = body.defaultModel?.trim() || 'chat';

  if (!endpoint || !apiKey) {
    return NextResponse.json({ error: 'Endpoint and API key are required.' }, { status: 400 });
  }
  if (!/^https?:\/\//i.test(endpoint)) {
    return NextResponse.json({ error: 'Endpoint must start with http:// or https://' }, { status: 400 });
  }

  // Validate the credentials against the live endpoint before persisting,
  // so reaching the app guarantees a working proxy.
  const probe = await probeProxy(endpoint, apiKey);
  if (!probe.ok) {
    return NextResponse.json(
      { error: probe.message ?? 'Could not validate the endpoint and key.', status: probe.status },
      { status: 422 },
    );
  }

  await prisma.config.upsert({
    where: { userId: claims.sub },
    create: { userId: claims.sub, endpoint, apiKey, defaultModel },
    update: { endpoint, apiKey, defaultModel },
  });

  return NextResponse.json({ ok: true, config: { endpoint, defaultModel, hasApiKey: true } });
}

// Update an existing config. apiKey is optional — when omitted the stored key
// is reused. The resulting credentials are always re-validated before saving.
export async function PATCH(req: NextRequest) {
  const claims = await getAuth();
  if (!claims) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const existing = await prisma.config.findUnique({ where: { userId: claims.sub } });
  if (!existing) {
    return NextResponse.json({ error: 'No configuration to update yet.' }, { status: 404 });
  }

  const body = (await req.json().catch(() => ({}))) as Body;
  const endpoint = body.endpoint != null ? normalizeEndpoint(body.endpoint) : existing.endpoint;
  const apiKey = body.apiKey?.trim() || existing.apiKey;
  const defaultModel = body.defaultModel?.trim() || existing.defaultModel;

  if (!/^https?:\/\//i.test(endpoint)) {
    return NextResponse.json({ error: 'Endpoint must start with http:// or https://' }, { status: 400 });
  }

  const probe = await probeProxy(endpoint, apiKey);
  if (!probe.ok) {
    return NextResponse.json(
      { error: probe.message ?? 'Could not validate the endpoint and key.', status: probe.status },
      { status: 422 },
    );
  }

  await prisma.config.update({
    where: { userId: claims.sub },
    data: { endpoint, apiKey, defaultModel },
  });

  return NextResponse.json({ ok: true, config: { endpoint, defaultModel, hasApiKey: true } });
}
