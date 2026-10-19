import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuth } from "@/lib/auth";
import { normalizeEndpoint, probeProxy } from "@/lib/user-config";
import { decryptApiKey, encryptApiKey } from "@/lib/api-keys";
import { rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

// Each save re-validates against the live endpoint (an upstream /models call),
// so unlimited saves also mean unlimited upstream requests — cap them.
const SAVE_LIMIT = { requests: 20, windowMs: 60_000 };

function checkSaveLimit(userId: string): NextResponse | null {
  const limited = rateLimit(
    `config-save:${userId}`,
    SAVE_LIMIT.requests,
    SAVE_LIMIT.windowMs,
  );
  if (limited.ok) return null;
  return NextResponse.json(
    { error: "Too many attempts. Try again later." },
    { status: 429, headers: { "Retry-After": String(limited.retryAfter) } },
  );
}

interface Body {
  endpoint?: string;
  apiKey?: string;
  defaultModel?: string;
}

export async function GET() {
  const claims = await getAuth();
  if (!claims)
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const config = await prisma.config.findUnique({
    where: { userId: claims.sub },
  });
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
  if (!claims)
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const limited = checkSaveLimit(claims.sub);
  if (limited) return limited;

  const body = (await req.json().catch(() => ({}))) as Body;
  const endpoint = normalizeEndpoint(body.endpoint ?? "");
  const apiKey = body.apiKey?.trim() ?? "";
  const defaultModel = body.defaultModel?.trim() || "chat";

  if (!endpoint || !apiKey) {
    return NextResponse.json(
      { error: "Endpoint and API key are required." },
      { status: 400 },
    );
  }
  if (!/^https?:\/\//i.test(endpoint)) {
    return NextResponse.json(
      { error: "Endpoint must start with http:// or https://" },
      { status: 400 },
    );
  }

  // Validate the credentials against the live endpoint before persisting,
  // so reaching the app guarantees a working proxy.
  const probe = await probeProxy(endpoint, apiKey);
  if (!probe.ok) {
    return NextResponse.json(
      {
        error: probe.message ?? "Could not validate the endpoint and key.",
        status: probe.status,
      },
      { status: 422 },
    );
  }

  // Encrypt at rest: a DB read must never hand out usable upstream keys.
  const storedKey = encryptApiKey(apiKey);
  await prisma.config.upsert({
    where: { userId: claims.sub },
    create: { userId: claims.sub, endpoint, apiKey: storedKey, defaultModel },
    update: { endpoint, apiKey: storedKey, defaultModel },
  });

  return NextResponse.json({
    ok: true,
    config: { endpoint, defaultModel, hasApiKey: true },
  });
}

// Update an existing config. apiKey is optional — when omitted the stored key
// is reused. The resulting credentials are always re-validated before saving.
export async function PATCH(req: NextRequest) {
  const claims = await getAuth();
  if (!claims)
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const limited = checkSaveLimit(claims.sub);
  if (limited) return limited;

  const existing = await prisma.config.findUnique({
    where: { userId: claims.sub },
  });
  if (!existing) {
    return NextResponse.json(
      { error: "No configuration to update yet." },
      { status: 404 },
    );
  }

  const body = (await req.json().catch(() => ({}))) as Body;
  const endpoint =
    body.endpoint != null
      ? normalizeEndpoint(body.endpoint)
      : existing.endpoint;
  // The stored key is encrypted; decrypt it for the re-validation probe.
  const newKey = body.apiKey?.trim() ?? "";
  const apiKey = newKey || decryptApiKey(existing.apiKey);
  const defaultModel = body.defaultModel?.trim() || existing.defaultModel;

  if (!/^https?:\/\//i.test(endpoint)) {
    return NextResponse.json(
      { error: "Endpoint must start with http:// or https://" },
      { status: 400 },
    );
  }

  const probe = await probeProxy(endpoint, apiKey);
  if (!probe.ok) {
    return NextResponse.json(
      {
        error: probe.message ?? "Could not validate the endpoint and key.",
        status: probe.status,
      },
      { status: 422 },
    );
  }

  await prisma.config.update({
    where: { userId: claims.sub },
    data: {
      endpoint,
      // Only re-encrypt when the caller supplied a new key; otherwise keep
      // the existing ciphertext (legacy plaintext rows stay plaintext until
      // they are next changed).
      apiKey: newKey ? encryptApiKey(apiKey) : existing.apiKey,
      defaultModel,
    },
  });

  return NextResponse.json({
    ok: true,
    config: { endpoint, defaultModel, hasApiKey: true },
  });
}
