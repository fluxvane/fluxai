import { NextRequest, NextResponse } from "next/server";
import { getResolvedConfig, normalizeEndpoint } from "@/lib/user-config";
import {
  assertPublicHttpEndpoint,
  validateProxyPath,
  EndpointError,
  ssrfDispatcher,
} from "@/lib/net-guard";
import { rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

// Per-user budget: signed-in users can still drive unlimited upstream traffic
// (server CPU, egress bandwidth, upstream bill) without a cap.
const PROXY_LIMIT = { requests: 120, windowMs: 60_000 };

// Non-streamed upstream responses are buffered before relaying; cap them so a
// huge payload can't exhaust server memory.
const MAX_UPSTREAM_BYTES = 10 * 1024 * 1024; // 10 MB

async function readCapped(
  body: ReadableStream<Uint8Array> | null,
  fallback: () => Promise<string>,
): Promise<{ text?: string; tooLarge?: boolean }> {
  if (!body) return { text: await fallback() };
  const reader = body.getReader();
  const chunks: Uint8Array[] = [];
  let received = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      received += value.byteLength;
      if (received > MAX_UPSTREAM_BYTES) {
        await reader.cancel();
        return { tooLarge: true };
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const merged = new Uint8Array(received);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return { text: new TextDecoder().decode(merged) };
}

async function proxy(req: NextRequest, path: string[]) {
  const config = await getResolvedConfig();
  if (!config) {
    return NextResponse.json(
      {
        error: "not_configured",
        message: "Sign in and complete configuration first.",
      },
      { status: 401 },
    );
  }

  const limited = rateLimit(
    `proxy:${config.userId}`,
    PROXY_LIMIT.requests,
    PROXY_LIMIT.windowMs,
  );
  if (!limited.ok) {
    return NextResponse.json(
      { error: "rate_limited", message: "Too many requests. Slow down." },
      { status: 429, headers: { "Retry-After": String(limited.retryAfter) } },
    );
  }

  const base = normalizeEndpoint(config.endpoint);

  // SSRF guard: the stored endpoint is user-controlled. Reject non-http(s)
  // schemes and anything that resolves to a private/reserved address (cloud
  // metadata, loopback, RFC 1918, …) before building the upstream URL.
  try {
    await assertPublicHttpEndpoint(base);
  } catch (err) {
    if (err instanceof EndpointError) {
      return NextResponse.json(
        { error: "upstream_forbidden", message: err.message },
        { status: 403 },
      );
    }
    throw err;
  }

  // Path traversal guard: decoded segments like "..", backslashes, or control
  // characters must never be re-encoded into an upstream URL.
  const joined = validateProxyPath(path);
  if (!joined) {
    return NextResponse.json(
      { error: "invalid_path", message: "Unsupported proxy path." },
      { status: 400 },
    );
  }

  const url = `${base}/${joined}${req.nextUrl.search}`;

  const init: RequestInit = {
    method: req.method,
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      "Content-Type": req.headers.get("content-type") ?? "application/json",
    },
    // Re-validate hostname + resolved IPs at connect time (and on every
    // redirect hop) — closes the DNS-rebinding/redirect hole in the
    // up-front assertPublicHttpEndpoint check.
    dispatcher: ssrfDispatcher(),
  } as RequestInit;

  if (req.method !== "GET" && req.method !== "HEAD") {
    init.body = await req.text();
  }

  try {
    const upstream = await fetch(url, init);

    // Stream chat completions straight through (SSE).
    const isChatStream =
      path[0] === "chat" && path[1] === "completions" && upstream.body;
    if (isChatStream) {
      const headers = new Headers();
      headers.set(
        "Content-Type",
        upstream.headers.get("content-type") ?? "text/event-stream",
      );
      headers.set("Cache-Control", "no-cache, no-transform");
      headers.set("Connection", "keep-alive");
      headers.set("X-Accel-Buffering", "no");
      return new Response(upstream.body, { status: upstream.status, headers });
    }

    const contentType =
      upstream.headers.get("content-type") ?? "application/json";
    const result = await readCapped(upstream.body, () => upstream.text());
    if (result.tooLarge) {
      return NextResponse.json(
        {
          error: "response_too_large",
          message: "Upstream response exceeded the 10 MB cap.",
        },
        { status: 502 },
      );
    }
    // Audit trail so proxy abuse is visible in server logs (console.warn
    // survives removeConsole in production builds).
    console.warn(
      `[proxy-audit] ${req.method} ${url} -> ${upstream.status} (${result.text!.length}B)`,
    );
    return new NextResponse(result.text, {
      status: upstream.status,
      headers: { "Content-Type": contentType },
    });
  } catch (err) {
    return NextResponse.json(
      {
        error: "upstream_error",
        message: err instanceof Error ? err.message : "fetch failed",
      },
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
