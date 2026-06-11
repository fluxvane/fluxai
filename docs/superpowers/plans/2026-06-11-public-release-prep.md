# Public Release Prep Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prepare `flux-ai` for public open-source release on `github.com/fluxvane/fluxai` by adding LICENSE, GitHub Actions CI, community docs, removing internal-only artifacts (`.gitlab-ci.yml`, `@fuse/`), and making code lint-clean — delivered as 9 atomic commits in one PR.

**Architecture:** Single PR on branch `chore/public-release-prep` → `develop`. Commits follow a security-first order: sensitive-data removal first, then mechanical formatting, then public-facing additions. Both `origin` (GitLab) and a new `github` remote are pushed to; PR is opened on GitHub.

**Tech Stack:** Next.js 15, React 19, TypeScript, Prisma 7, MUI 5, pnpm, ESLint 8, Prettier, Vitest, Playwright, GitHub Actions, MIT License.

---

## File Structure

### New Files

- `LICENSE` — MIT license text, copyright Fluxvane
- `CONTRIBUTING.md` — How to file issues, run tests, submit PRs
- `SECURITY.md` — How to report vulnerabilities
- `CODE_OF_CONDUCT.md` — Contributor Covenant v2.1
- `.github/workflows/ci.yml` — Lint + typecheck + vitest on PR/push
- `.github/ISSUE_TEMPLATE/bug_report.md` — Bug report template
- `.github/ISSUE_TEMPLATE/feature_request.md` — Feature request template
- `.github/PULL_REQUEST_TEMPLATE.md` — PR checklist
- `.prettierignore` — Exclude generated/lockfile/intake
- `docs/assets/screenshots/README.md` — Placeholder for future screenshots

### Modified Files

- `README.md` — Add GitHub badges, Contributing/Security links, screenshots section
- `package.json` — Add `format` script (verify exists); add `lucide-react` only if icon replacement needed
- `.env.e2e.example` — Replace `proxy.fluxvane.com` with generic placeholder URL
- `app/config/page.tsx` — Replace hardcoded `proxy.fluxvane.com` with empty/placeholder
- `tsconfig.json` — Verify strict mode (no behavior change if already strict)

### Removed Files

- `.gitlab-ci.yml` — Internal deploy handled outside repo CI
- `@fuse/core/FuseSvgIcon.tsx` — Dead code (no usages found)
- `@fuse/` directory — Empty after file removal

### Verified Untouched

- `prisma/schema.prisma` — No sensitive refs
- `middleware.ts` — No branding
- All API routes — Generic, no internal URLs
- `src/lib/prisma.ts`, `src/lib/auth.ts`, `src/lib/user-config.ts` — No branding refs

---

## Task 1: Security scrub — remove `.gitlab-ci.yml` and audit internal refs

**Files:**

- Delete: `.gitlab-ci.yml`
- Modify: `.env.e2e.example` (replace 2 instances of `https://proxy.fluxvane.com/v1`)
- Modify: `app/config/page.tsx` (replace 2 instances of `https://proxy.fluxvane.com/v1`)

- [ ] **Step 1: Delete `.gitlab-ci.yml`**

Run: `rm .gitlab-ci.yml`
Verify: `git status` shows `.gitlab-ci.yml` as deleted

- [ ] **Step 2: Edit `.env.e2e.example` — replace internal proxy URL**

Open `.env.e2e.example`. Find both occurrences of `https://proxy.fluxvane.com/v1` and replace with `https://your-proxy.example.com/v1` (a clearly-fake placeholder, suitable for an MIT-licensed public repo).

Expected result: lines 13-14 now read:

```
# OpenAI-compatible proxy URL (e.g. https://your-proxy.example.com/v1)
E2E_ENDPOINT=https://your-proxy.example.com/v1
```

- [ ] **Step 3: Edit `app/config/page.tsx` — replace hardcoded proxy default**

Open `app/config/page.tsx`. Find the two references to `https://proxy.fluxvane.com/v1`:

- Line 21: `const [endpoint, setEndpoint] = useState('https://proxy.fluxvane.com/v1');`
- Line 110: `placeholder="https://proxy.fluxvane.com/v1"`

Replace both with empty string `''` (so users must enter their own proxy URL — correct behavior for a public, multi-tenant app).

Expected result:

- Line 21: `const [endpoint, setEndpoint] = useState('');`
- Line 110: `placeholder="https://your-proxy.example.com/v1"` (placeholder shown but no default)

- [ ] **Step 4: Verify no other internal-domain refs remain**

Run:

```bash
git grep -nE 'fluxvane\.com|dev-ai\.fluxvane|gitlab\.com/fluxvane' \
  -- ':!docs/superpowers/specs/2026-06-11-public-release-prep-design.md'
```

Expected: `No matches found` (only the spec file may still mention these; the spec is internal planning doc, not source code).

- [ ] **Step 5: Run lint + typecheck + unit tests to confirm nothing broke**

Run:

```bash
pnpm install
pnpm lint
pnpm typecheck 2>/dev/null || pnpm tsc --noEmit
pnpm test
```

Expected: All pass. If `pnpm typecheck` script doesn't exist, fall back to `pnpm tsc --noEmit`.

- [ ] **Step 6: Commit**

Run:

```bash
git add .gitlab-ci.yml .env.e2e.example app/config/page.tsx
git rm .gitlab-ci.yml
git commit -m "chore(security): scrub sensitive refs and remove .gitlab-ci.yml

- Delete .gitlab-ci.yml (references private gitlab.com/fluxvane/devops)
- Replace proxy.fluxvane.com with empty default + generic placeholder
  in .env.e2e.example and app/config/page.tsx
- No functional regression; users must enter their own proxy URL"
```

---

## Task 2: Format & lint — Prettier + ESLint --fix, then fix remaining warnings

**Files:**

- Modify: all source files touched by `pnpm format` and `pnpm lint:fix`
- Add: `.prettierignore`

- [ ] **Step 1: Verify Prettier is installed; add if missing**

Run: `pnpm list prettier 2>/dev/null || echo "MISSING"`

If missing, add it as a devDependency:

```bash
pnpm add -D prettier
```

- [ ] **Step 2: Create `.prettierignore`**

Write `/.prettierignore` with:

```
node_modules
.next
out
dist
build
coverage
pnpm-lock.yaml
src/generated
playwright-report
test-results
.playwright-mcp
```

- [ ] **Step 3: Add `format` script to `package.json` if missing**

Open `package.json`. Verify `"format"` script exists. If not, add it to the `scripts` block:

```json
"format": "prettier --write \"**/*.{ts,tsx,js,jsx,json,md,yml,yaml}\" --ignore-path .prettierignore",
"format:check": "prettier --check \"**/*.{ts,tsx,js,jsx,json,md,yml,yaml}\" --ignore-path .prettierignore"
```

- [ ] **Step 4: Run Prettier write**

Run: `pnpm format`

Expected: A list of reformatted files. No errors.

- [ ] **Step 5: Run ESLint --fix**

Run: `pnpm lint:fix`

Expected: Auto-fixed issues, possibly with remaining warnings listed.

- [ ] **Step 6: Run ESLint with --max-warnings 0; fix remaining issues manually**

Run: `pnpm lint`

If there are remaining warnings/errors, fix them manually in the relevant file. Common patterns:

- Unused imports → remove
- Unused variables → prefix with `_` or remove
- `any` types → add proper type
- Missing `key` props in maps

Re-run `pnpm lint` until exit code is 0.

- [ ] **Step 7: Run unit tests to confirm nothing broke from formatting**

Run: `pnpm test`

Expected: All pass.

- [ ] **Step 8: Commit**

Run:

```bash
git add -A
git commit -m "chore(format): apply prettier and eslint --fix across codebase

Mechanical formatting only. No behavior change. Resolves all
remaining lint warnings to satisfy --max-warnings 0 in CI."
```

---

## Task 3: Remove `@fuse/` directory (dead code, license unclear)

**Files:**

- Delete: `@fuse/core/FuseSvgIcon.tsx`
- Delete: `@fuse/` directory (after file removal)
- Modify: `package.json` (no `lucide-react` needed — icon is unused)

- [ ] **Step 1: Verify `FuseSvgIcon` is not imported anywhere**

Run:

```bash
git grep -n 'FuseSvgIcon' -- ':!@fuse/'
```

Expected: `No matches found`. (Earlier audit confirmed no usages.)

- [ ] **Step 2: Remove the file and directory**

Run:

```bash
git rm @fuse/core/FuseSvgIcon.tsx
rmdir @fuse/core @fuse
```

Verify: `ls @fuse/ 2>/dev/null || echo "directory removed"`

- [ ] **Step 3: Verify build still works**

Run: `pnpm build`

Expected: Build succeeds. (If `@fuse/` was referenced by tsconfig paths or similar, the build will fail — fix any such reference, but the audit showed none.)

- [ ] **Step 4: Commit**

Run:

```bash
git add -A
git commit -m "chore(deps): drop vendored @fuse/core/FuseSvgIcon

FuseSvgIcon was the only file in @fuse/ and had no consumers in
the codebase. Removing the vendored MUI-template code eliminates
license ambiguity before public release. No replacement needed —
Lucide React remains available if icons are added later."
```

---

## Task 4: Branding — replace internal-domain URLs in docs

**Files:**

- Modify: `README.md` (replace `dev-ai.fluxvane.com` references)
- Modify: any other docs/configs found in Step 1 search

- [ ] **Step 1: Re-scan for any remaining `fluxvane.com` references**

Run:

```bash
git grep -nE 'fluxvane\.com' \
  -- ':!docs/superpowers/specs/2026-06-11-public-release-prep-design.md' \
  -- ':!docs/superpowers/plans/2026-06-11-public-release-prep.md'
```

Expected: Empty (Task 1 should have caught them all). If anything found, replace with appropriate placeholder.

- [ ] **Step 2: Update README production-deployment references**

Open `README.md`. Find any reference to `dev-ai.fluxvane.com` or the in-house deployment domain. Replace with generic text:

- Change "Default port" or "Production URL" sections to use placeholders.
- Keep the Troubleshooting section's `curl http://localhost:3008/api/health` (still correct).

If no such references exist (since they're mostly in `.gitlab-ci.yml` which we removed), skip to Step 3.

- [ ] **Step 3: Commit (or skip if no changes)**

If changes were made:

```bash
git add README.md
git commit -m "chore(docs): replace internal domain refs with generic placeholders"
```

If no changes, skip this commit.

---

## Task 5: Add LICENSE (MIT)

**Files:**

- Create: `LICENSE`

- [ ] **Step 1: Write LICENSE file**

Write `/LICENSE` with the standard MIT text, copyright year 2026, copyright holder "Fluxvane":

```
MIT License

Copyright (c) 2026 Fluxvane

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

- [ ] **Step 2: Commit**

Run:

```bash
git add LICENSE
git commit -m "docs: add MIT LICENSE

Copyright (c) 2026 Fluxvane. Released under MIT terms; see LICENSE
for full text."
```

---

## Task 6: Rewrite README with GitHub-specific sections

**Files:**

- Modify: `README.md`

- [ ] **Step 1: Add GitHub badges block at the top**

Open `README.md`. Right after the `# Flux AI` heading, insert:

```markdown
[![CI](https://github.com/fluxvane/fluxai/actions/workflows/ci.yml/badge.svg)](https://github.com/fluxvane/fluxai/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](./CONTRIBUTING.md)
```

- [ ] **Step 2: Add a "Screenshots" section after the Features block**

Insert (after the Features list, before the Stack heading):

```markdown
## Screenshots

> Screenshots will be added once we have a public demo URL. In the
> meantime, see `docs/assets/screenshots/README.md` for the planned
> layout and how to contribute one.
```

- [ ] **Step 3: Add "Contributing", "Security", and "License" footer sections**

At the end of README (after the Troubleshooting block), append:

```markdown
## Contributing

Issues and PRs are welcome. See [CONTRIBUTING.md](./CONTRIBUTING.md) for
how to file a bug, suggest a feature, and submit changes.

## Security

To report a vulnerability privately, see [SECURITY.md](./SECURITY.md).
Please **do not** file public issues for security reports.

## License

[MIT](./LICENSE) — Copyright (c) 2026 Fluxvane.
```

- [ ] **Step 4: Replace any "internal" deploy references**

If the existing README mentions a specific internal deployment domain or infra
(grep result of `git grep -E 'fluxvane|dev-ai'` in README), replace with
generic text or remove. (Most of these were in `.gitlab-ci.yml` which is
already deleted.)

- [ ] **Step 5: Create the screenshots placeholder file**

Write `docs/assets/screenshots/README.md`:

```markdown
# Screenshots

This directory is where public screenshots / GIFs of the running app
should be added. When you add one, link it from the top-level
`README.md` "Screenshots" section.

Recommended content:

- `login.png` — login/register page
- `chat.png` — chat with thinking panel open
- `image-studio.png` — image generation view
- `analytics.png` — analytics dashboard

Capture at 1280×800 minimum. PNG or WebP preferred.
```

- [ ] **Step 6: Verify README still renders sensibly**

Run: `pnpm format` (in case Prettier wants to reformat the new markdown)

- [ ] **Step 7: Commit**

Run:

```bash
git add README.md docs/assets/screenshots/README.md
git commit -m "docs: rewrite README with GitHub badges, screenshots stub, and footer sections

Adds: CI/license/PRs-welcome badges, Screenshots section pointing to
docs/assets/screenshots/, and Contributing/Security/License footer
sections linking to the new community docs."
```

---

## Task 7: Add community docs (CONTRIBUTING, SECURITY, CODE_OF_CONDUCT)

**Files:**

- Create: `CONTRIBUTING.md`
- Create: `SECURITY.md`
- Create: `CODE_OF_CONDUCT.md`

- [ ] **Step 1: Write `CONTRIBUTING.md`**

Write `/CONTRIBUTING.md` with this content:

```markdown
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

app/ — Next.js App Router pages + API routes
src/
components/ — shared React components
contexts/ — React context providers
hooks/ — custom React hooks
lib/ — server-side utilities (auth, prisma, etc.)
types/ — shared TypeScript types
e2e/ — Playwright end-to-end tests
prisma/ — Prisma schema and migrations

```

## License

By contributing, you agree that your contributions will be licensed
under the [MIT License](./LICENSE).
```

- [ ] **Step 2: Write `SECURITY.md`**

Write `/SECURITY.md` with this content:

```markdown
# Security Policy

## Supported versions

The latest minor release on the `develop` branch receives security
updates. Older versions are not maintained.

| Version   | Supported |
| --------- | --------- |
| `develop` | ✅        |
| Older     | ❌        |

## Reporting a vulnerability

Please **do not** open a public GitHub issue for security
vulnerabilities.

Email security reports to: **security@fluxvane.example** (replace
with your real address before opening the PR). Include:

- A description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)

We aim to acknowledge reports within 3 business days.

## Scope

In scope:

- Authentication / authorization bypass
- SQL injection, XSS, CSRF
- Secret leakage (API keys, JWT secrets, database credentials)
- Remote code execution

Out of scope:

- Denial of service attacks against the demo deployment
- Issues in third-party dependencies (file upstream)
- Missing security headers that don't lead to exploitation
```

- [ ] **Step 3: Write `CODE_OF_CONDUCT.md`**

Write `/CODE_OF_CONDUCT.md` with the standard Contributor Covenant v2.1
text. The full text is at
<https://www.contributor-covenant.org/version/2/1/code_of_conduct/> —
copy it verbatim, then update the contact email at the bottom from
`[INSERT CONTACT METHOD]` to `conduct@fluxvane.example`.

- [ ] **Step 4: Commit**

Run:

```bash
git add CONTRIBUTING.md SECURITY.md CODE_OF_CONDUCT.md
git commit -m "docs: add CONTRIBUTING, SECURITY, and CODE_OF_CONDUCT

- CONTRIBUTING.md: dev setup, test commands, PR workflow, code style
- SECURITY.md: supported versions, private reporting channel
- CODE_OF_CONDUCT.md: Contributor Covenant v2.1
- All emails use fluxvane.example placeholder; update before merging"
```

---

## Task 8: Add GitHub Actions CI workflow

**Files:**

- Create: `.github/workflows/ci.yml`

- [ ] **Step 1: Write `.github/workflows/ci.yml`**

Write `/.github/workflows/ci.yml` with this content:

```yaml
name: CI

on:
  push:
    branches: [develop, main]
  pull_request:
    branches: [develop, main]

jobs:
  build:
    name: Lint, typecheck, test
    runs-on: ubuntu-latest
    timeout-minutes: 15

    services:
      postgres:
        image: postgres:16-alpine
        env:
          POSTGRES_USER: flux_ai
          POSTGRES_PASSWORD: flux_ai
          POSTGRES_DB: flux_ai
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    env:
      DATABASE_URL: postgresql://flux_ai:flux_ai@localhost:5432/flux_ai?schema=public
      JWT_SECRET: ci-only-do-not-use-in-production-xxxxxxxxxxxxxxxx

    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v4
        with:
          version: 10.33.0

      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: pnpm

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Prisma generate
        run: pnpm prisma generate

      - name: Lint
        run: pnpm lint

      - name: Typecheck
        run: pnpm tsc --noEmit

      - name: Unit tests
        run: pnpm test

      - name: Build
        run: pnpm build
```

Notes:

- Postgres service is included so `pnpm prisma generate` and unit tests
  that touch the DB can run. The app's `lib/prisma.ts` lazy-loads the
  client, so a misconfigured DB won't fail boot — but tests should
  still have a real connection available.
- E2E tests are intentionally **not** run (per user decision).
- `JWT_SECRET` is a placeholder; CI never uses it for real auth.

- [ ] **Step 2: Verify the workflow file is valid YAML**

Run:

```bash
python3 -c "import yaml,sys; yaml.safe_load(open('.github/workflows/ci.yml'))" && echo OK
```

Expected: `OK`. If it errors, fix the YAML (most common issue: tab vs space).

- [ ] **Step 3: Commit**

Run:

```bash
git add .github/workflows/ci.yml
git commit -m "ci: add GitHub Actions workflow (lint + typecheck + test + build)

Runs on every PR and push to develop/main. Uses a Postgres service
container so Prisma generate and any DB-touching unit tests have a
live database. E2E tests are intentionally skipped (run locally)."
```

---

## Task 9: Add GitHub issue and PR templates

**Files:**

- Create: `.github/ISSUE_TEMPLATE/bug_report.md`
- Create: `.github/ISSUE_TEMPLATE/feature_request.md`
- Create: `.github/PULL_REQUEST_TEMPLATE.md`

- [ ] **Step 1: Write `bug_report.md`**

Write `/.github/ISSUE_TEMPLATE/bug_report.md`:

```markdown
---
name: Bug report
about: Report unexpected behavior
title: "[Bug] "
labels: bug
assignees: ""
---

## Describe the bug

A clear and concise description of what the bug is.

## To reproduce

Steps to reproduce the behavior:

1. Go to '...'
2. Click on '...'
3. Scroll down to '...'
4. See error

## Expected behavior

A clear and concise description of what you expected to happen.

## Screenshots / logs

If applicable, add screenshots or paste relevant console output.

## Environment

- OS: [e.g. macOS 15]
- Browser: [e.g. Chrome 125]
- Node version: [e.g. 22.12.0]
- pnpm version: [e.g. 10.33.0]
- Commit SHA: [e.g. `7258012`]

## Additional context

Any other relevant information.
```

- [ ] **Step 2: Write `feature_request.md`**

Write `/.github/ISSUE_TEMPLATE/feature_request.md`:

```markdown
---
name: Feature request
about: Suggest a new feature
title: "[Feature] "
labels: enhancement
assignees: ""
---

## Problem

A clear and concise description of what the problem is. Ex. "I'm
always frustrated when [...]"

## Proposed solution

A clear and concise description of what you want to happen.

## Alternatives considered

Any alternative solutions or features you've considered.

## Additional context

Screenshots, mockups, or links to similar features in other tools.
```

- [ ] **Step 3: Write PR template**

Write `/.github/PULL_REQUEST_TEMPLATE.md`:

```markdown
## Summary

<!-- One paragraph describing the change. -->

## Type of change

- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation only
- [ ] Refactor

## Checklist

- [ ] My code follows the project's style (`pnpm lint` passes)
- [ ] I have added tests that prove my fix/feature works
- [ ] New and existing unit tests pass locally (`pnpm test`)
- [ ] I have updated relevant documentation
- [ ] My changes generate no new warnings

## How to verify

<!-- Commands the reviewer can run to verify the change locally. -->

## Screenshots

<!-- If this is a UI change, add before/after screenshots. -->

## Related issues

<!-- Link related issues: Fixes #123, Relates to #456 -->
```

- [ ] **Step 4: Commit**

Run:

```bash
git add .github/ISSUE_TEMPLATE/ .github/PULL_REQUEST_TEMPLATE.md
git commit -m "chore: add GitHub issue and PR templates

- bug_report.md: structured repro + environment info
- feature_request.md: problem + proposed solution + alternatives
- PULL_REQUEST_TEMPLATE.md: type-of-change checkboxes, test/lint
  verification, screenshots section"
```

---

## Task 10: Final verification and PR preparation

**Files:**

- (verification only, no file changes)

- [ ] **Step 1: Run the full local verification suite**

Run:

```bash
pnpm install
pnpm lint
pnpm typecheck 2>/dev/null || pnpm tsc --noEmit
pnpm test
pnpm build
```

Expected: All pass. If anything fails, fix before continuing.

- [ ] **Step 2: Verify no internal-domain refs leaked into source**

Run:

```bash
git grep -nE 'fluxvane\.com|gitlab\.com/fluxvane' \
  -- ':!docs/superpowers/specs/' \
  -- ':!docs/superpowers/plans/' \
  -- ':!CHANGELOG*' \
  -- ':!.gitlab-ci.yml'
```

Expected: `No matches found`.

- [ ] **Step 3: Verify final commit log**

Run: `git log --oneline develop..HEAD`

Expected: 9 commits, each with a clear conventional-commit message.

- [ ] **Step 4: Add GitHub remote and push branch**

```bash
git remote add github https://github.com/fluxvane/fluxai.git
git push -u github chore/public-release-prep
```

Expected: Branch pushed to GitHub.

- [ ] **Step 5: Push to GitLab mirror too**

```bash
git push origin chore/public-release-prep
```

Expected: Branch pushed to GitLab.

- [ ] **Step 6: Open PR on GitHub**

Use `gh pr create` (or the GitHub web UI):

```bash
gh pr create \
  --base develop \
  --head chore/public-release-prep \
  --title "chore: prep for public release — LICENSE, CI, docs, lint clean" \
  --body-file - <<'EOF'
## Summary

Prepares flux-ai for public open-source release on github.com/fluxvane/fluxai.
Adds MIT LICENSE, GitHub Actions CI, community docs (CONTRIBUTING, SECURITY,
CODE_OF_CONDUCT), and GitHub issue/PR templates. Removes internal-only
artifacts (`.gitlab-ci.yml`, vendored `@fuse/`) and makes the code lint-clean.

## Commits

1. `chore(security): scrub sensitive refs and remove .gitlab-ci.yml`
2. `chore(format): apply prettier and eslint --fix across codebase`
3. `chore(deps): drop vendored @fuse/core/FuseSvgIcon`
4. `chore(docs): replace internal domain refs with generic placeholders` (if any)
5. `docs: add MIT LICENSE`
6. `docs: rewrite README with GitHub badges, screenshots stub, and footer sections`
7. `docs: add CONTRIBUTING, SECURITY, and CODE_OF_CONDUCT`
8. `ci: add GitHub Actions workflow (lint + typecheck + test + build)`
9. `chore: add GitHub issue and PR templates`

## How to verify locally

\`\`\`bash
pnpm install
pnpm lint
pnpm test
pnpm build
\`\`\`

E2E tests are not run in CI per project policy. Run `pnpm e2e` locally
if you have a real OpenAI-compatible proxy configured.

## Out of scope

- Refactoring components/hooks/contexts
- Migrating deploy pipeline off GitLab (GitLab stays for internal deploy)
- Auto-publishing Docker images
- Upgrading Next.js / React major versions

## Checklist

- [x] LICENSE added (MIT)
- [x] CI runs on every PR (lint + typecheck + test + build)
- [x] README has Contributing/Security/License footer
- [x] Issue + PR templates added
- [x] `.gitlab-ci.yml` removed
- [x] `@fuse/` removed
- [x] No `fluxvane.com` / internal-domain refs in source
EOF
```

Expected: PR opened at `https://github.com/fluxvane/fluxai/pull/<N>`.

- [ ] **Step 7: Confirm CI is green on the PR**

Wait for the GitHub Actions run on the PR to complete. If it fails,
investigate and push fixes to the same branch.

---

## Self-Review Notes

**1. Spec coverage:**

- Decision: keep "Fluxvane/flux-ai" → reflected in copyright + URL
- Decision: MIT → Task 5
- Decision: GitHub Actions full → Task 8
- Decision: Replace `@fuse/` with Lucide → Task 3 (refined: remove entirely, no Lucide needed since icon is unused)
- Decision: README keep + GitHub-specific → Task 6
- Decision: GitHub new, keep GitLab → Task 10 step 4-6
- Decision: Cleanup + lint clean → Task 2
- Decision: E2E skip in CI → Task 8 (no e2e step)
- Decision: Full community files → Tasks 7 + 9
- Decision: Delete `.gitlab-ci.yml` → Task 1
- Decision: Sensitive-data removal first → Task 1 is first
- Acceptance criteria → all 10 covered in Task 10

**2. Placeholder scan:** No "TBD"/"TODO" left. Email placeholders (`fluxvane.example`) are explicitly flagged in commit messages for the user to update.

**3. Type consistency:** No new types introduced; all changes are file-level. No method signatures to cross-check.
