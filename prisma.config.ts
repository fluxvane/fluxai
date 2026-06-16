import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  // Read the URL lazily via process.env so `prisma generate` (which needs no DB)
  // works in CI/Docker without DATABASE_URL set. migrate / db push pick it up
  // from .env (loaded above) when run locally.
  datasource: {
    url: process.env.DATABASE_URL ?? "",
    // Shadow database for `prisma migrate dev`. The `flux_ai` role lacks CREATEDB,
    // so Prisma can't create/drop its default throwaway shadow DB (P3014). We point
    // it at a pre-provisioned, flux_ai-owned database instead (see README → Database
    // → "Shadow database for `migrate dev`"); Prisma only resets the schema inside it.
    // Only attached when SHADOW_DATABASE_URL is set, so `prisma generate` in CI/Docker
    // (no DB at all) and `migrate deploy` (no shadow needed) are unaffected.
    ...(process.env.SHADOW_DATABASE_URL
      ? { shadowDatabaseUrl: process.env.SHADOW_DATABASE_URL }
      : {}),
  },
});
