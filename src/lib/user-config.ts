import { prisma } from '@/lib/prisma';
import { getAuth } from '@/lib/auth';

export interface ResolvedConfig {
  userId: string;
  endpoint: string;
  apiKey: string;
  defaultModel: string;
}

/** Returns the signed-in user's proxy config (including the secret apiKey). Server-only. */
export async function getResolvedConfig(): Promise<ResolvedConfig | null> {
  const claims = await getAuth();
  if (!claims) return null;
  const config = await prisma.config.findUnique({ where: { userId: claims.sub } });
  if (!config) return null;
  return {
    userId: claims.sub,
    endpoint: config.endpoint,
    apiKey: config.apiKey,
    defaultModel: config.defaultModel,
  };
}

export function normalizeEndpoint(endpoint: string): string {
  return endpoint.trim().replace(/\/+$/, '');
}

/** Probes <endpoint>/models with the key to confirm the credentials work. */
export async function probeProxy(endpoint: string, apiKey: string): Promise<{ ok: boolean; status: number; message?: string }> {
  const base = normalizeEndpoint(endpoint);
  try {
    const res = await fetch(`${base}/models`, {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(15_000),
    });
    if (res.ok) return { ok: true, status: res.status };
    return { ok: false, status: res.status, message: `Endpoint responded with ${res.status}.` };
  } catch (err) {
    return {
      ok: false,
      status: 0,
      message: err instanceof Error ? err.message : 'Could not reach the endpoint.',
    };
  }
}
