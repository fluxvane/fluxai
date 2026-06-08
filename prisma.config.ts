import 'dotenv/config';
import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  // Read the URL lazily via process.env so `prisma generate` (which needs no DB)
  // works in CI/Docker without DATABASE_URL set. migrate / db push pick it up
  // from .env (loaded above) when run locally.
  datasource: {
    url: process.env.DATABASE_URL ?? '',
  },
});
