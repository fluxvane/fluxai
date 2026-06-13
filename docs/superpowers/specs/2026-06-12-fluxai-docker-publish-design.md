# Fluxvane FluxAI Docker Publish — Design

**Date:** 2026-06-12
**Status:** Approved (brainstorming complete)
**Owner:** thontm
**Target repo:** `fluxvane/fluxai`
**Target registry:** `ghcr.io/fluxvane/fluxai`

## Problem

The `fluxvane/fluxai` repo has a `Dockerfile` but no automated build + push
pipeline. Today, every container publish is manual (`docker build` +
`docker push` + manual tag management). With the new branch protection
(thontm-only PR approval) and the org policy as code, builds after merge
should be automatic and consistent.

## Goals

1. On every push to `main` or `develop` (i.e. after a merge), build a Docker
   image from the existing `Dockerfile` and push to `ghcr.io/fluxvane/fluxai`.
2. Tag format: `{env}-{shortSHA}` where `env` is `prod` for `main`, `dev` for
   `develop`; `shortSHA` is the first 7 chars of the full git SHA.
3. Single-arch `linux/amd64` (no multi-arch, no arm64).
4. Layer cache via GitHub Actions cache backend (`type=gha`).
5. Make the ghcr.io package **public** (matches the public repo visibility).

## Non-goals

- Build on PR (no `pull_request` trigger, no PR-only cache hit).
- Multi-arch (`linux/arm64`).
- `latest` tag, semver tags from releases, branch tags, or any other tag.
- Vulnerability scanning (Trivy, Snyk, Grype).
- SBOM / provenance attestation.
- Auto-rollout to deployment infra.
- Composite reusable action across repos (overkill for 1 repo).

## Constraints

- Use only `GITHUB_TOKEN` (auto-provided by GHA). No PAT, no registry-specific
  secrets. `GITHUB_TOKEN` with `packages: write` is sufficient to push to
  `ghcr.io/<org>/<repo>` from a workflow in that repo.
- Trigger is `main` + `develop` only. No PR builds.
- Tag must be deterministic from the commit (no race when two merges land in
  quick succession on develop).

## Architecture

Single new workflow file `.github/workflows/docker-publish.yml`, completely
separate from the existing `ci.yml`.

### Trigger

```yaml
on:
  push:
    branches: [main, develop]
  workflow_dispatch: # manual safety valve / re-run
```

### Permissions (job-level)

```yaml
permissions:
  contents: read # checkout
  packages: write # ghcr.io push
```

### Job flow

```
1. actions/checkout@v4
2. docker/setup-buildx-action@v3
3. docker/login-action@v3
     registry: ghcr.io
     username: ${{ github.actor }}
     password: ${{ secrets.GITHUB_TOKEN }}
4. env_from_branch:
     if [[ ${{ github.ref_name }} == "main" ]]; then env=prod; else env=dev; fi
5. short_sha: ${${{ github.sha }}::7}
6. tag: ${env}-${short_sha}
7. docker/metadata-action@v5
     tags: |
       name=ghcr.io/fluxvane/fluxai
       tag=${env}-${short_sha}
     # No flavor=latest, no semver. Single deterministic tag.
8. docker/build-push-action@v6
     context: .
     file: ./Dockerfile
     push: true
     platforms: linux/amd64
     tags: ghcr.io/fluxvane/fluxai:${env}-${short_sha}
     labels: |
       org.opencontainers.image.revision=${{ github.sha }}
       org.opencontainers.image.source=${{ github.server_url }}/${{ github.repository }}
     cache-from: type=gha
     cache-to:   type=gha,mode=max
9. (post-step) ensure package public (see Error handling §3)
```

### Concurrency

```yaml
concurrency:
  group: docker-${{ github.ref }}
  cancel-in-progress: false
```

`cancel-in-progress: false` — never kill a half-done image push; let both
complete (tags are sha-deterministic, no conflict).

## Data flow

```
git push (main|develop)
  → GHA webhook
  → runner: checkout @ github.sha
  → buildx builds image
  → push to ghcr.io/fluxvane/fluxai:${env}-${short_sha}
  → post-step: PATCH package visibility = public
  → GHA cache populated (layer reuse for next push)
```

### Inputs

- `github.sha` (full 40-char SHA)
- `github.ref_name` (`main` or `develop`)
- `github.actor` (push author)
- `github.repository` (`fluxvane/fluxai`)

### Outputs

- One image in `ghcr.io/fluxvane/fluxai` with a unique tag per push
- GHA cache populated, scoped to the repo

### Secrets

| Secret         | Source               | Why                                                             |
| -------------- | -------------------- | --------------------------------------------------------------- |
| `GITHUB_TOKEN` | auto-provided by GHA | `packages: write` to push to this repo's `ghcr.io/<org>/<repo>` |
| _none other_   | —                    | No Docker Hub creds, no PAT                                     |

## Error handling

1. **Build failure** (Dockerfile syntax, missing dep): GHA marks job red, no
   push happens, no cleanup needed.
2. **Push failure** (registry outage, token revoked): GHA marks job red.
   Partial layers may exist in the registry; layer cache is content-addressed
   by digest, so a partial cache is recoverable. No automatic cleanup.
3. **Package-visibility PATCH** (`POST /orgs/fluxvane/packages/container/fluxai`
   PATCH with `visibility=public`): tolerates 404 (package not yet created
   on first run), 422 (already public). Use `continue-on-error: true` with
   `if: always()` so it never blocks the workflow.
4. **Out-of-disk on runner**: handled by BuildKit GC inside the
   `build-push-action`; not our concern.
5. **Force-push / branch rename**: not applicable (`push` event, not
   `ref-update`).
6. **Two merges race into develop**: both jobs run, both push different
   tags (sha-deterministic). No conflict.

## Testing

No automated integration test in CI. Reasons: no ephemeral ghcr.io
registry, no test runner that simulates merges. The validation strategy:

1. **Workflow file syntax**: eyeball-check at PR review. `actionlint` is a
   future addition.
2. **Local Dockerfile smoke**: `docker build -t test .` on dev machine to
   catch Dockerfile issues. Documented in repo README.
3. **Real integration test**: merge a small change to `develop`, watch the
   workflow run, verify `ghcr.io/fluxvane/fluxai:dev-<shortsha>` exists and
   is public.
4. **`workflow_dispatch`**: lets a maintainer re-run the build for the
   current default branch without pushing a no-op commit. Use case: re-push
   after a registry-side cleanup.

## Tasks (one-shot)

1. Create `.github/workflows/docker-publish.yml` with the contents above.
2. Add the post-step that makes the package public (idempotent).
3. Verify by merging a small change to `develop`; confirm the image appears
   in `ghcr.io/fluxvane/fluxai` with the expected tag and visibility.
4. Update `README.md` with the image reference.

## Out of scope (future)

- Multi-arch (`linux/arm64`).
- `latest` tag or semver tags from GitHub Releases.
- Trivy/Snyk vulnerability scanning in the same workflow.
- SBOM via `anchore/sbom-action` and SLSA provenance.
- Composite action in `fluxvane/flux-images` for reuse across repos.
- Dependabot auto-update of the `docker/*` actions.

## Bootstrapping notes

- The Dockerfile already exists at the repo root and is assumed to be
  correct (not modified by this work).
- `GITHUB_TOKEN` is auto-provided; no repo settings change needed for the
  workflow to push.
- The first push will fail the post-step with 404 (package doesn't exist
  until first push). The post-step is `continue-on-error: true`, so the
  workflow still succeeds. The next push will find the package and flip it
  public.
- After the workflow runs once, verify visibility at
  <https://github.com/fluxvane/fluxai/packages> or via
  `gh api /orgs/fluxvane/packages/container/fluxai`.
