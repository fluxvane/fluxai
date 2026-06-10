# Flux AI

A polished chat + image studio over any OpenAI-compatible proxy. Next.js 15 (App
Router) + MUI, with JWT auth, per-user proxy configuration, conversation history,
analytics, and image generation — all backed by a single Postgres database via
Prisma 7.

## Features

- **Auth** — email/password register + sign-in, JWT in an httpOnly cookie.
- **Config gate** — after sign-in you connect a proxy (endpoint + API key + default
  model). Credentials are validated against the live endpoint and stored
  server-side; the key is never exposed to the browser.
- **Chat** — streaming responses with a live, animated **thinking** panel
  (`reasoning_content` / `<think>` tokens), markdown + syntax highlighting, model
  picker, regenerate, and DB-backed conversation history.
- **Image studio** — prompt → image via `/images/generations`, saved to a personal
  gallery (graceful error UI when the upstream image backend is unavailable).
- **Analytics** — conversations, messages, tokens, model usage, and a 14-day
  activity chart, aggregated from the database.

## Stack

- Next.js 15 / React 19 / MUI 5 / framer-motion
- Prisma 7 (`prisma-client` generator + `@prisma/adapter-pg`) on PostgreSQL
- `jose` (JWT) + `bcryptjs` (password hashing)

## Getting started

1. Install dependencies:

   ```bash
   pnpm install
   ```

2. Configure environment — copy `.env.example` to `.env` and set:

   ```env
   DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/flux_ai?schema=public"
   JWT_SECRET="a-long-random-string"
   ```

3. Create the schema in the database:

   ```bash
   pnpm db:push      # or: pnpm db:migrate for migration history
   ```

4. Run the dev server (auto-runs `prisma generate`):

   ```bash
   pnpm dev          # http://localhost:3008
   ```

Register an account, connect your proxy on the config screen, and start chatting.

## Scripts

| Script           | Description                                            |
| ---------------- | ------------------------------------------------------ |
| `pnpm dev`       | Dev server on port 3008                                |
| `pnpm build`     | `prisma generate` + production build                   |
| `pnpm start`     | Start the production build                             |
| `pnpm db:push`   | Push the Prisma schema to the database                 |
| `pnpm db:studio` | Open Prisma Studio                                     |
| `pnpm test`      | Unit tests (Vitest)                                    |
| `pnpm e2e`       | End-to-end tests (Playwright) — see `.env.e2e.example` |

## Database

The Prisma client is generated into `src/generated/prisma` (git-ignored) and uses
the `pg` driver adapter required by Prisma 7. Models: `User`, `Config`,
`Conversation`, `Message`, `GeneratedImage`.

### Granting privileges to the app role

Both the application database and the connecting role are named `flux_ai`. If
the connection role lacks DML privileges on the schema (e.g. you see
`permission denied for table users` from Prisma), grant them once from a role
that **owns** the schema (typically the `postgres` superuser or the role that
ran the migration). Run as that owner:

```sql
-- Run with the schema owner (e.g. postgres / admin), NOT as flux_ai.
GRANT USAGE ON SCHEMA public TO flux_ai;

GRANT ALL PRIVILEGES
  ON ALL TABLES IN SCHEMA public
  TO flux_ai;

GRANT ALL PRIVILEGES
  ON ALL SEQUENCES IN SCHEMA public
  TO flux_ai;

-- Future tables created by `prisma migrate` / `db push` inherit the same access.
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT ALL ON TABLES TO flux_ai;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT ALL ON SEQUENCES TO flux_ai;
```

Verify with:

```sql
SELECT grantee, privilege_type
FROM information_schema.role_table_grants
WHERE table_schema = 'public' AND table_name = 'users';
-- `flux_ai` should appear with INSERT/UPDATE/SELECT/DELETE
```

## Notes

- The app talks to providers only through the server-side proxy at
  `/api/proxy/[...path]`, which injects the signed-in user's API key — keys never
  reach the client.
- The default model is `chat`. The model picker lists everything the proxy exposes
  at `/v1/models`.
