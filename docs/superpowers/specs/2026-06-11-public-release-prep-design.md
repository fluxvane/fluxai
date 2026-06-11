# Public Release Prep — Design Spec

**Date:** 2026-06-11
**Status:** Draft, awaiting user approval
**Target repo:** `fluxvane/fluxai` on GitHub (already exists)
**Source repo (local):** `fluxvane/flux-ai` on GitLab
**Branch:** `chore/public-release-prep` → `develop` (via PR)

## Goal

Make `fluxvane/fluxai` on GitHub production-ready for a public open-source
release:

- Trust signals present (LICENSE, README with quickstart, CI badge, contributing guide)
- Code lint-clean, secrets-free, branded consistently
- CI runs on every PR (lint + typecheck + unit tests)
- E2E remains runnable locally but is skipped in CI (per user choice)
- All changes delivered as a single, reviewable PR with atomic commits

## Non-Goals

- Refactoring for refactoring's sake (no code-organization rewrites)
- Migrating deploy pipeline off GitLab (GitLab stays for internal deploy)
- Adding new features
- Auto-publishing npm packages / container images from this PR

## Decisions (from brainstorming)

| Decision               | Choice                                                                          |
| ---------------------- | ------------------------------------------------------------------------------- |
| GitHub identity        | Keep "Fluxvane/flux-ai" naming                                                  |
| License                | MIT                                                                             |
| CI scope               | GitHub Actions full (lint + typecheck + vitest, **no e2e**)                     |
| Vendored `@fuse/` icon | Replace with Lucide React, remove `@fuse/` dir                                  |
| README                 | Keep existing + add GitHub-specific sections (badges, screenshots)              |
| GitLab vs GitHub       | Keep both remotes; GitHub is public, GitLab is internal deploy                  |
| Cleanup scope          | Cleanup + lint clean (Prettier + ESLint --fix + fix remaining warnings)         |
| E2E in CI              | Skip (run locally only)                                                         |
| Community files        | Full set: CONTRIBUTING, SECURITY, CODE_OF_CONDUCT, issue templates, PR template |
| `.gitlab-ci.yml`       | Delete (internal deploy uses GitLab directly without repo CI)                   |
| Commit order           | Sensitive-data removal **first**, then formatting, then additions               |

## Architecture / Strategy

### 1. Remote & Branch Setup

- `origin` → GitLab (unchanged, used for internal deploy)
- `github` → `https://github.com/fluxvane/fluxai.git` (new remote, added)
- Work happens on branch `chore/public-release-prep`
- PR target: `develop` (matches current local default branch)
- All commits pushed to **both** remotes; PR opened on GitHub

### 2. Commit Order (security-first)

The first commit removes sensitive data; later commits add public-facing files
(LICENSE, CI, docs). This way, even if the PR is partially reverted, the repo
never sits in a "MIT-licensed + sensitive-data-still-present" state.

```
1. chore(security): scrub sensitive refs + remove .gitlab-ci.yml
2. chore(format): apply prettier + eslint --fix + fix remaining warnings
3. chore(icons): replace @fuse/FuseSvgIcon with lucide-react, drop @fuse/
4. chore(branding): swap fluxvane.com URLs for GitHub placeholders
5. docs: add LICENSE (MIT)
6. docs: rewrite README with GitHub badges + screenshots
7. docs: add CONTRIBUTING, SECURITY, CODE_OF_CONDUCT
8. ci: add GitHub Actions workflow (lint + typecheck + test)
9. chore: add .github issue + PR templates
```

### 3. Files Added (new)

| Path                                        | Purpose                                           |
| ------------------------------------------- | ------------------------------------------------- |
| `LICENSE`                                   | MIT license, copyright Fluxvane                   |
| `CONTRIBUTING.md`                           | How to file issues, run tests, submit PRs         |
| `SECURITY.md`                               | How to report vulnerabilities, supported versions |
| `CODE_OF_CONDUCT.md`                        | Contributor Covenant v2.1                         |
| `.github/workflows/ci.yml`                  | Lint + typecheck + vitest on PR + push to develop |
| `.github/ISSUE_TEMPLATE/bug_report.md`      | Bug report template                               |
| `.github/ISSUE_TEMPLATE/feature_request.md` | Feature request template                          |
| `.github/PULL_REQUEST_TEMPLATE.md`          | PR checklist                                      |
| `docs/assets/screenshot-placeholder.txt`    | Reminder to add real screenshots                  |

### 4. Files Modified

| Path                       | Change                                                                   |
| -------------------------- | ------------------------------------------------------------------------ |
| `README.md`                | Add badges, screenshots, Contributing/Security links, GitHub issue links |
| `package.json`             | Add `prettier` if missing; ensure `format` script; add `lucide-react`    |
| `tsconfig.json`            | Tighten strict settings if loose (verify only)                           |
| `app/login/page.tsx`, etc. | Branding text changes if needed (audit)                                  |
| `app/config/page.tsx`      | Branding text changes if needed (audit)                                  |
| All source files           | Prettier formatting (auto) + ESLint --fix                                |

### 5. Files Removed

| Path                         | Reason                                                 |
| ---------------------------- | ------------------------------------------------------ |
| `.gitlab-ci.yml`             | GitHub is public, internal deploy uses GitLab directly |
| `@fuse/core/FuseSvgIcon.tsx` | Vendored, replaced by Lucide                           |
| `@fuse/` directory           | Empty after icon removal                               |

### 6. Verification (per commit)

After each commit, the following must pass:

```bash
pnpm install              # commit 1 has no deps change, but verify lockfile
pnpm lint                 # zero warnings (--max-warnings 0)
pnpm typecheck            # tsc --noEmit
pnpm test                 # vitest run
pnpm build                # prisma generate + next build (if any code changed)
```

For the e2e suite (skipped in CI but still works locally):

```bash
pnpm e2e                  # run with .env.e2e (not in CI)
```

### 7. PR Plan

- **Title:** `chore: prep for public release — LICENSE, CI, docs, lint clean`
- **Description template:**
  - Summary of changes (1 paragraph)
  - Checklist (8 items, one per commit)
  - "How to verify locally" (4 commands)
  - Screenshots / before-after for README
  - "Out of scope" section (refactors, GitLab deploy changes)

## Risks & Mitigations

| Risk                                        | Mitigation                                                         |
| ------------------------------------------- | ------------------------------------------------------------------ |
| Prettier reformats 60 files → huge diff     | Single dedicated commit; reviewer can verify it's all formatting   |
| ESLint --fix doesn't fix everything         | Manual follow-up commit; aim for `--max-warnings 0`                |
| Lucide icon replacement breaks UI           | Visual check after replacement; commit small enough to review      |
| `fluxvane.com` URLs scattered in code       | Audit + sed/replace in dedicated commit                            |
| GitHub repo already has commits/history     | All our changes go in **one branch + one PR**; no force-push       |
| Internal services mentioned in comments     | Search for "TODO: deploy", "internal", domain names; manual review |
| `.env.e2e.example` contains test creds      | Verify they're clearly fake placeholders; redact if not            |
| Prisma generated client in `src/generated/` | Already git-ignored, no action needed                              |

## Out of Scope

- Refactoring components, hooks, contexts
- Splitting large files
- Adding new tests (only run existing ones)
- Changing Postgres schema
- Replacing Prisma with another ORM
- Migrating off `pnpm`
- Upgrading Next.js / React major versions
- Setting up auto-deploy from GitHub Actions
- Publishing Docker images to GitHub Container Registry

## Acceptance Criteria

The PR is mergeable when:

1. All 9 commits are present, each independently meaningful
2. `pnpm lint` passes with zero warnings
3. `pnpm test` passes
4. `pnpm build` succeeds
5. `pnpm e2e` succeeds locally (manual verification, not in CI)
6. Grep confirms no `fluxvane.com`, internal domain names, or vendor refs remain
7. `LICENSE`, `README.md`, `CONTRIBUTING.md`, `SECURITY.md`, `CODE_OF_CONDUCT.md` all present
8. `.github/workflows/ci.yml` runs green on a test PR
9. `.gitlab-ci.yml` is removed
10. `@fuse/` directory is removed
