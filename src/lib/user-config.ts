import { prisma } from "@/lib/prisma";
import { getAuth } from "@/lib/auth";
import { decryptApiKey } from "@/lib/api-keys";
import {
  assertPublicHttpEndpoint,
  EndpointError,
} from "@/lib/net-guard";

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
  const config = await prisma.config.findUnique({
    where: { userId: claims.sub },
  });
  if (!config) return null;
  return {
    userId: claims.sub,
    endpoint: config.endpoint,
    // Stored encrypted (v1.…) — decrypt for upstream use. Legacy plaintext
    // rows pass through untouched until the next save.
    apiKey: decryptApiKey(config.apiKey),
    defaultModel: config.defaultModel,
  };
}

export function normalizeEndpoint(endpoint: string): string {
  return endpoint.trim().replace(/\/+$/, "");
}

/** Probes <endpoint>/models with the key to confirm the credentials work. */
export async function probeProxy(
  endpoint: string,
  apiKey: string,
): Promise<{ ok: boolean; status: number; message?: string }> {
  const base = normalizeEndpoint(endpoint);
  // The config-save probe is an SSRF vector too: never fetch an endpoint that
  // points at a private/reserved address or a non-http(s) scheme.
  try {
    await assertPublicHttpEndpoint(base);
  } catch (err) {
    if (err instanceof EndpointError) {
      return { ok: false, status: 0, message: err.message };
    }
    throw err;
  }
  try {
    const res = await fetch(`${base}/models`, {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(15_000),
    });
    if (res.ok) return { ok: true, status: res.status };
    return {
      ok: false,
      status: res.status,
      message: `Endpoint responded with ${res.status}.`,
    };
  } catch (err) {
    return {
      ok: false,
      status: 0,
      message:
        err instanceof Error ? err.message : "Could not reach the endpoint.",
    };
  }
}
