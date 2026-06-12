# Flux AI

[![CI](https://github.com/fluxvane/fluxai/actions/workflows/ci.yml/badge.svg)](https://github.com/fluxvane/fluxai/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](./CONTRIBUTING.md)

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

## Screenshots

> Screenshots will be added once we have a public demo URL. In the
> meantime, see `docs/assets/screenshots/README.md` for the planned
> layout and how to contribute one.

## Stack

- Next.js 15 / React 19 / MUI 5 / framer-motion
- Prisma 7 (`prisma-client` generator + `@prisma/adapter-pg`) on PostgreSQL
- `jose` (JWT) + `bcryptjs` (password hashing)

## Docker images

Pre-built images are published to GitHub Container Registry on every push to
`main` (tagged `prod-*`) and `develop` (tagged `dev-*`):

```bash
docker pull ghcr.io/fluxvane/fluxai:dev-<short-sha>
docker run --rm -p 3008:3008 ghcr.io/fluxvane/fluxai:dev-<short-sha>
```

The full set of tags is visible at
<https://github.com/fluxvane/fluxai/pkgs/container/fluxai>. The package is
public.

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

## Troubleshooting

### `PrismaClientKnownRequestError: P1008 — Operations have timed out` on first request

The lazy `PrismaClient` proxy in `src/lib/prisma.ts` only constructs the
underlying client on the first DB call, so a wrong `DATABASE_URL` does **not**
fail at boot — it surfaces as a 30s+ timeout on the first request (typically
`POST /api/auth/register` or `POST /api/auth/login`).

This is a runtime misconfig, almost always one of:

1. **Wrong host or port** — the URL is well-formed but the container can't reach
   the host:port (DNS not resolved, service not on the target network, wrong
   port). The URL is baked into the image at build time by the Dockerfile's
   `VERSION` arg → env-file copy, so a re-build with the right `VERSION` is
   usually required.
2. **Bad scheme** — anything other than `postgresql://` / `postgres://`.
3. **Missing port** — Postgres URLs without an explicit port default silently
   in some libraries; the client now rejects this so it fails fast.
4. **Trailing whitespace or quote characters** in the env file.

Use the health probe to confirm DB reachability independently of the auth
flow:

```bash
curl -s http://localhost:3008/api/health | jq
# → { "ok": true,  "db": "up",   "latencyMs": 12 }
# → { "ok": false, "db": "down", "error": "...", "databaseHost": "postgresql://flux_ai:***@db:5432/flux_ai" }
```

The error response includes a redacted `databaseHost` so you can verify which
URL the running container is actually using.

To inspect the URL baked into a running container:

```bash
docker exec <container> sh -c 'grep ^DATABASE_URL .env | sed "s/:[^:@]*@/:***@/"'
```

To rebuild against the right environment:

```bash
docker build --build-arg VERSION=uat    -t flux-ai:uat    .   # uses .env.uat
docker build --build-arg VERSION=latest -t flux-ai:latest .   # uses .env.production
# (no VERSION arg)                                            # uses .env.development
```

### `DATABASE_URL is not set` at request time

The env file matching the build's `VERSION` arg was missing or empty. Confirm
the file exists at build context root (`./.env.uat`, `./.env.production`, or
`./.env.development` for the default `VERSION`).

## Contributing

Issues and PRs are welcome. See [CONTRIBUTING.md](./CONTRIBUTING.md) for
how to file a bug, suggest a feature, and submit changes.

## Security

To report a vulnerability privately, see [SECURITY.md](./SECURITY.md).
Please **do not** file public issues for security reports.

## License

[MIT](./LICENSE) — Copyright (c) 2026 Fluxvane.
