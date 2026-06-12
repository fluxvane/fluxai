# FluxAI Docker Publish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Auto-build and push `fluxvane/fluxai` Docker images to `ghcr.io/fluxvane/fluxai` on every push to `main` or `develop`, with deterministic `{env}-{shortSHA}` tags and a public package.

**Architecture:** A single new GitHub Actions workflow `.github/workflows/docker-publish.yml`, triggered by `push` to `main`/`develop` plus `workflow_dispatch`. Uses `docker/*` official actions, `GITHUB_TOKEN` for auth, `type=gha` for layer cache. A post-step PATCHes the package to public (idempotent).

**Tech Stack:** GitHub Actions, docker/build-push-action@v6, docker/login-action@v3, docker/setup-buildx-action@v3, docker/metadata-action@v5, ghcr.io.

---

## File Structure

| File                                   | Responsibility                                          | Created in |
| -------------------------------------- | ------------------------------------------------------- | ---------- |
| `.github/workflows/docker-publish.yml` | The workflow itself: trigger, jobs, post-step           | Task 1     |
| `README.md` (modify)                   | Add "Docker images" section with the registry reference | Task 2     |

Single-file change (the workflow). README is a one-paragraph add. No tests
file (testing happens in CI on real merge; see spec §"Testing").

---

## Task 1: Create `.github/workflows/docker-publish.yml`

**Files:**

- Create: `/Users/thontm/workspaces/companies/fluxvane/flux-ai/.github/workflows/docker-publish.yml`

- [ ] **Step 1: Verify current branch**

```bash
cd /Users/thontm/workspaces/companies/fluxvane/flux-ai
git branch --show-current
```

Expected: you're on a working branch (e.g., `chore/public-release-prep`,
`feat/docker-publish`, or similar). If on `main` or `develop`, switch to a
feature branch first:

```bash
git checkout -b feat/docker-publish
```

- [ ] **Step 2: Write the workflow file**

Create `.github/workflows/docker-publish.yml` with the EXACT contents below
(do not improvise — every line matters for correctness):

```yaml
name: docker-publish

on:
  push:
    branches: [main, develop]
  workflow_dispatch:

permissions:
  contents: read
  packages: write

concurrency:
  group: docker-${{ github.ref }}
  cancel-in-progress: false

jobs:
  build-and-push:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Log in to ghcr.io
        uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Derive env + tag
        id: meta
        run: |
          if [[ "${{ github.ref_name }}" == "main" ]]; then
            echo "env=prod" >> "$GITHUB_OUTPUT"
          else
            echo "env=dev" >> "$GITHUB_OUTPUT"
          fi
          echo "short_sha=${${{ github.sha }}::7}" >> "$GITHUB_OUTPUT"
          echo "image=ghcr.io/fluxvane/fluxai" >> "$GITHUB_OUTPUT"
          echo "tag=${env}-${short_sha}" >> "$GITHUB_OUTPUT"
          echo "::group::Computed metadata"
          echo "image=${{ steps.meta.outputs.image }}:${{ steps.meta.outputs.tag }}"
          echo "::endgroup::"

      - name: Build and push
        uses: docker/build-push-action@v6
        with:
          context: .
          file: ./Dockerfile
          push: true
          platforms: linux/amd64
          tags: ${{ steps.meta.outputs.image }}:${{ steps.meta.outputs.tag }}
          labels: |
            org.opencontainers.image.title=flux-ai
            org.opencontainers.image.description=Fluxvane FluxAI dashboard
            org.opencontainers.image.source=${{ github.server_url }}/${{ github.repository }}
            org.opencontainers.image.revision=${{ github.sha }}
            org.opencontainers.image.created=${{ github.event.head_commit.timestamp }}
          cache-from: type=gha
          cache-to: type=gha,mode=max

      - name: Make package public
        if: always()
        continue-on-error: true
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        run: |
          # Tolerate 404 (package not yet created on first push) and 422
          # (already public, or other constraint). The lib's paid-plan
          # grep doesn't match these — inline toleration here.
          set +e
          HTTP=$(gh api \
            -X PATCH \
            -H "Accept: application/vnd.github+json" \
            /orgs/fluxvane/packages/container/fluxai \
            -f visibility=public \
            --include -o /dev/null -w "%{http_code}" 2>&1)
          case "$HTTP" in
            2*) echo "[ok] package set to public" ;;
            404) echo "[skip] package does not exist yet (will retry next push)" ;;
            422) echo "[skip] package visibility already public or other 422" ;;
            *) echo "[fail] unexpected HTTP $HTTP"; exit 1 ;;
          esac
```

- [ ] **Step 3: Validate the YAML**

```bash
cd /Users/thontm/workspaces/companies/fluxvane/flux-ai
yq -P . .github/workflows/docker-publish.yml > /dev/null && echo "YAML OK"
```

If `yq` is not installed, use Python:

```bash
python3 -c "import yaml; yaml.safe_load(open('.github/workflows/docker-publish.yml'))" && echo "YAML OK"
```

Expected: `YAML OK`.

- [ ] **Step 4: Self-check key fields**

```bash
yq '.on.push.branches' .github/workflows/docker-publish.yml
yq '.jobs.build-and-push.steps | length' .github/workflows/docker-publish.yml
yq '.permissions' .github/workflows/docker-publish.yml
```

Expected:

- `["main", "develop"]`
- `6` (checkout, buildx, login, meta, build-push, make-public)
- `{"contents":"read","packages":"write"}`

- [ ] **Step 5: Commit and push**

```bash
git add .github/workflows/docker-publish.yml
git commit -m "ci: add docker-publish workflow for ghcr.io

Trigger: push to main/develop + workflow_dispatch.
Builds linux/amd64 image from existing Dockerfile and pushes to
ghcr.io/fluxvane/fluxai with tag \`{env}-{shortSHA}\` where env is
prod (main) or dev (develop). GHA layer cache reuses layers across
runs. Post-step makes the package public (idempotent, tolerates
404 on first push and 422 if already public)."

git push -u origin $(git branch --show-current)
```

Expected: commit lands on remote. **Do NOT open a PR yet** — Task 2 must
land in the same PR.

---

## Task 2: Update README with the image reference

**Files:**

- Modify: `/Users/thontm/workspaces/companies/fluxvane/flux-ai/README.md` (add a "Docker images" section)

- [ ] **Step 1: Locate the right insertion point**

```bash
cd /Users/thontm/workspaces/companies/fluxvane/flux-ai
grep -n "^## " README.md | head -10
```

Expected: a list of `## Heading` lines. Insert the new section after the
first matching heading (typically `## Overview` or `## Quickstart`).
Use the line number to position the edit.

- [ ] **Step 2: Add the section**

Find a stable anchor in the README (e.g., a `## Quickstart` heading) and
add a `## Docker images` section immediately after it. Use the Edit tool
with `old_string` = the existing heading + 1 blank line, and `new_string`
= existing heading + 1 blank line + new section. Example:

````markdown
## Quickstart

...existing quickstart content...

## Docker images

Pre-built images are published to GitHub Container Registry on every push to
`main` (tagged `prod-*`) and `develop` (tagged `dev-*`):

```bash
docker pull ghcr.io/fluxvane/fluxai:dev-<short-sha>
docker run --rm -p 3008:3008 ghcr.io/fluxvane/fluxai:dev-<short-sha>
```
````

The full set of tags is visible at
<https://github.com/fluxvane/fluxai/pkgs/container/fluxai>. The package is
public.

````

- [ ] **Step 3: Verify the README still renders**

```bash
grep -A 2 "## Docker images" README.md | head -5
````

Expected: shows the new section header and 2 lines below.

- [ ] **Step 4: Commit and push**

```bash
git add README.md
git commit -m "docs: add Docker images section pointing to ghcr.io"
git push
```

---

## Task 3: Open the PR and merge to `develop`

**Files:** (no code change — process step)

- [ ] **Step 1: Open the PR**

```bash
gh pr create \
  --base develop \
  --head $(git branch --show-current) \
  --title "ci: auto-publish Docker images to ghcr.io" \
  --body "Adds \`.github/workflows/docker-publish.yml\` that builds and pushes Docker images to \`ghcr.io/fluxvane/fluxai\` on every push to \`main\`/\`develop\`, with deterministic \`{env}-{shortSHA}\` tags. Includes a post-step to make the package public (idempotent). See the spec at \`docs/superpowers/specs/2026-06-12-fluxai-docker-publish-design.md\`."
```

Expected: PR URL printed. CI will run.

- [ ] **Step 2: Watch CI on the PR**

```bash
gh pr checks --watch
```

Expected: existing `ci.yml` runs `Lint, typecheck, test` (passes, since this
PR only adds a workflow file and a README section). The new
`docker-publish.yml` does NOT trigger on PRs (by design — push trigger
only), so it will not run on this PR.

- [ ] **Step 3: Merge the PR**

```bash
gh pr merge --squash --delete-branch
```

Expected: PR merged into `develop`. This is the first real trigger of the
`docker-publish.yml` workflow.

- [ ] **Step 4: Watch the docker-publish run on develop**

```bash
gh run list --workflow docker-publish --limit 1
gh run watch $(gh run list --workflow docker-publish --limit 1 --json databaseId -q '.[] | .databaseId')
```

Expected: the workflow starts within ~30s of the merge. Steps run in
order: checkout → buildx → login → meta → build-push → make-public. Total
time: 2-5 minutes for a fresh build, 30-60s for cached.

- [ ] **Step 5: Verify the image exists**

```bash
gh api /orgs/fluxvane/packages/container/fluxai | jq '{name, visibility, package_type}'
```

Expected:

- `name: "fluxai"`
- `visibility: "public"`
- `package_type: "container"`

If `visibility` is still `"private"`, that's OK on the very first run (the
post-step may have 404'd because the package was just being created). Wait
60s and re-check; if still private, run the `make-public` command manually:

```bash
gh api -X PATCH -H "Accept: application/vnd.github+json" \
  /orgs/fluxvane/packages/container/fluxai \
  -f visibility=public
```

- [ ] **Step 6: Verify the tag**

```bash
gh api /orgs/fluxvane/packages/container/fluxai/versions | jq '.[] | {name, created_at, metadata: .metadata.container.tags}'
```

Expected: at least 1 version. Its `tags` array contains one string like
`["dev-a1b2c3d"]`. The exact `a1b2c3d` matches the short SHA of the merge
commit. Verify by comparing to:

```bash
git rev-parse --short=7 HEAD
```

---

## Task 4: Tag a main merge (optional smoke test)

**Files:** (no code — process step)

This task verifies the `env=prod` path. Skip if `main` is not yet stable or
you don't want to merge anything to `main` right now.

- [ ] **Step 1: Open a PR from develop to main**

```bash
gh pr create \
  --base main \
  --head develop \
  --title "chore: promote develop to main (docker-publish smoke test)" \
  --body "Promote develop to main to verify the docker-publish workflow triggers with \`env=prod\` tag on the main branch."
```

- [ ] **Step 2: Watch the workflow**

```bash
gh run watch $(gh run list --workflow docker-publish --limit 1 --json databaseId -q '.[] | .databaseId')
```

Expected: workflow runs, pushes image with `prod-<shortsha>` tag.

- [ ] **Step 3: Verify the prod tag**

```bash
gh api /orgs/fluxvane/packages/container/fluxai/versions | \
  jq '.[] | .metadata.container.tags[]' | grep '^prod-' | head -3
```

Expected: at least one `prod-<shortsha>` tag.

- [ ] **Step 4: (Optional) Roll back the PR**

If you don't want this `chore: promote` PR to be permanent, close it (don't
merge) or revert after merging. The image tag is already published, so
deleting the merge commit doesn't remove the image.

---

## Self-Review

**1. Spec coverage:**

| Spec section                                      | Covered by                                                                     |
| ------------------------------------------------- | ------------------------------------------------------------------------------ |
| Goal 1 (build + push on push to main/develop)     | Task 1 trigger + Steps 2-3                                                     |
| Goal 2 (tag format `{env}-{shortSHA}`)            | Task 1 Step 2 "Derive env + tag"                                               |
| Goal 3 (single-arch linux/amd64)                  | Task 1 Step 2 `platforms: linux/amd64`                                         |
| Goal 4 (GHA layer cache)                          | Task 1 Step 2 `cache-from: type=gha` / `cache-to: type=gha,mode=max`           |
| Goal 5 (public package)                           | Task 1 Step 2 "Make package public" post-step + Task 3 Step 5 verification     |
| Non-goals: no PR build, no multi-arch, no latest  | Confirmed absent in trigger + platforms + tags                                 |
| Constraints: GITHUB_TOKEN only, deterministic tag | Task 1 `permissions: packages: write`, `secrets.GITHUB_TOKEN`, sha-derived tag |
| Architecture §"Single new workflow file"          | Task 1                                                                         |
| Architecture §"Concurrency"                       | Task 1 `concurrency: cancel-in-progress: false`                                |
| Error handling §3 (package-visibility PATCH)      | Task 1 Step 2 inline `case` statement + Task 3 Step 5 manual fallback          |
| Testing (real integration on merge)               | Task 3 Steps 4-6                                                               |
| `workflow_dispatch` safety valve                  | Task 1 trigger                                                                 |
| README image reference                            | Task 2                                                                         |

**2. Placeholder scan:** No TBD/TODO. All code blocks complete. ✓

**3. Type/name consistency:**

- `image` / `tag` / `env` / `short_sha` output names from "Derive env + tag" step are referenced identically in "Build and push" step (`steps.meta.outputs.image`, etc.). ✓
- `ghcr.io/fluxvane/fluxai` used in both the tag and the make-public PATCH endpoint. ✓
- Workflow file name `docker-publish.yml` referenced consistently. ✓
