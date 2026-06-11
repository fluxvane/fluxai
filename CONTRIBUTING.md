# Contributing to Flux AI

Thanks for your interest in contributing! This document covers how
to file issues, propose features, and submit code changes.

## Filing issues

Use the issue templates in `.github/ISSUE_TEMPLATE/`. Choose **Bug
report** for unexpected behavior and **Feature request** for new
functionality.

## Development setup

1. Fork the repo and clone your fork.
2. Install Node.js 22.12 or later.
3. Install pnpm 10: `npm install -g pnpm@10`
4. Install deps: `pnpm install`
5. Copy `.env.example` to `.env` and fill in `DATABASE_URL` +
   `JWT_SECRET`.
6. Run the dev server: `pnpm dev` (port 3008).

## Running tests

| Command          | What it runs                                           |
| ---------------- | ------------------------------------------------------ |
| `pnpm test`      | Unit tests (Vitest)                                    |
| `pnpm e2e`       | End-to-end tests (Playwright, local Postgres required) |
| `pnpm lint`      | ESLint (must be zero warnings)                         |
| `pnpm typecheck` | `tsc --noEmit`                                         |
| `pnpm build`     | Production build                                       |

E2E tests are not run in CI (they need a real proxy). Run them
locally before opening a PR.

## Submitting a pull request

1. Branch from `develop`.
2. Keep commits atomic and use conventional commit messages
   (`feat:`, `fix:`, `chore:`, `docs:`, `refactor:`).
3. Ensure `pnpm lint`, `pnpm typecheck`, `pnpm test`, and
   `pnpm build` all pass locally.
4. Open the PR against `develop` and fill in the PR template.

## Code style

- TypeScript strict mode is enforced.
- ESLint and Prettier are the source of truth — run them before
  committing.
- Prefer small, focused files. Co-locate tests with the code they
  cover when practical.

## Project structure

```
app/         — Next.js App Router pages + API routes
src/
  components/  — shared React components
  contexts/    — React context providers
  hooks/       — custom React hooks
  lib/         — server-side utilities (auth, prisma, etc.)
  types/       — shared TypeScript types
e2e/          — Playwright end-to-end tests
prisma/       — Prisma schema and migrations
```

## License

By contributing, you agree that your contributions will be licensed
under the [MIT License](./LICENSE).
