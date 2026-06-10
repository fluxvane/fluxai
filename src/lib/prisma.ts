import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function getClient(): PrismaClient {
  if (globalForPrisma.prisma) return globalForPrisma.prisma;
  const raw = process.env.DATABASE_URL;
  if (!raw) {
    throw new Error("DATABASE_URL is not set");
  }
  // Fail fast on misconfig so we don't hang into a P1008 timeout on first request.
  // The driver-adapter path bypasses schema-level URL validation, so common
  // mistakes (wrong scheme, empty user, trailing whitespace, non-postgres host)
  // would otherwise surface as a 30s+ timeout with no actionable message.
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    throw new Error(
      `DATABASE_URL is not a valid URL. Got: ${JSON.stringify(raw.slice(0, 80))}`,
    );
  }
  if (parsed.protocol !== "postgres:" && parsed.protocol !== "postgresql:") {
    throw new Error(
      `DATABASE_URL must use the postgres:// or postgresql:// scheme. Got: ${parsed.protocol}`,
    );
  }
  if (!parsed.hostname) {
    throw new Error(`DATABASE_URL is missing a hostname. Got: ${raw}`);
  }
  if (!parsed.port) {
    // Default port can mask a misconfig; make it explicit.
    throw new Error(
      `DATABASE_URL has no port. Specify one explicitly (e.g. :5432) so a wrong-port misconfig fails fast instead of timing out. Got: ${raw}`,
    );
  }

  const client = new PrismaClient({
    adapter: new PrismaPg({ connectionString: raw }),
  });
  globalForPrisma.prisma = client;
  return client;
}

/**
 * Lazy proxy: the real client (and its DB connection) is only created on first
 * property access — at request time in the running container — never at import
 * time. This keeps `next build` (which imports route modules to collect page
 * data) from requiring DATABASE_URL during the Docker build.
 */
export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    const client = getClient();
    const value = Reflect.get(client, prop, client);
    return typeof value === "function"
      ? (value as (...args: unknown[]) => unknown).bind(client)
      : value;
  },
}) as PrismaClient;
