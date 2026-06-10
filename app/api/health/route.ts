import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Liveness + DB reachability probe.
 *
 * Returns 200 with `{ ok: true, db: 'up' }` when the app can talk to Postgres.
 * Returns 503 with a descriptive error when it cannot — useful for catching
 * misconfigured DATABASE_URL (wrong host/port, bad scheme, missing env) at
 * deploy time instead of on the first user request (where it surfaces as a
 * Prisma P1008 timeout with no context).
 */
export async function GET() {
  const startedAt = Date.now();
  try {
    // `SELECT 1` exercises the full client → adapter → pg → Postgres path
    // without depending on any specific table existing yet.
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({
      ok: true,
      db: "up",
      latencyMs: Date.now() - startedAt,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      {
        ok: false,
        db: "down",
        error: message,
        // Echo the (redacted) host so operators can spot a wrong-host misconfig
        // without exposing credentials. Format: postgresql://USER:***@HOST:PORT/db
        databaseHost: redactDatabaseUrl(process.env.DATABASE_URL),
      },
      { status: 503 },
    );
  }
}

function redactDatabaseUrl(raw: string | undefined): string | null {
  if (!raw) return null;
  try {
    const u = new URL(raw);
    if (u.password) u.password = "***";
    return `${u.protocol}//${u.username}${u.password ? ":***" : ""}@${u.host}${u.pathname}`;
  } catch {
    return "(unparseable)";
  }
}
