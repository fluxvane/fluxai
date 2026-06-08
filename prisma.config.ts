import 'dotenv/config';
import { defineConfig, env } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  // Migrate / db push reads the connection URL from here in Prisma 7.
  datasource: {
    url: env('DATABASE_URL'),
  },
});
