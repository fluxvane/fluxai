import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuth, clearAuthCookie } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET() {
  const claims = await getAuth();
  if (!claims) {
    return NextResponse.json({ user: null }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: claims.sub },
    select: {
      id: true,
      email: true,
      name: true,
      config: { select: { endpoint: true, defaultModel: true } },
    },
  });

  if (!user) {
    // Orphaned token: the JWT is cryptographically valid (so the edge
    // middleware keeps treating the request as authenticated and serves "/"),
    // but its user no longer exists in the DB. Left alone, this traps the UI in
    // a "/" -> /api/auth/me 401 -> router.replace("/login") -> middleware
    // bounces /login back to "/" loop. Purging the cookie here makes the next
    // request unauthenticated, so middleware lets /login render and the loop
    // ends.
    await clearAuthCookie();
    return NextResponse.json({ user: null }, { status: 401 });
  }

  return NextResponse.json({
    user: { id: user.id, email: user.email, name: user.name },
    hasConfig: !!user.config,
    config: user.config
      ? {
          endpoint: user.config.endpoint,
          defaultModel: user.config.defaultModel,
        }
      : null,
  });
}
