# Fluxvane Org Policy — Public Release Setup

**Date:** 2026-06-12
**Status:** Approved (brainstorming complete)
**Owner:** thontm
**Target org:** fluxvane (github.com/fluxvane)
**Target repo:** fluxvane/fluxai (currently public, branch `develop`)

## Problem

The `fluxvane` GitHub org is being prepared for public release of the `fluxai` repo. Today there are no enforced org policies, no branch protection on `main`/`develop`, and no secret scan gate before the public flip. The owner (`thontm`) wants a tracked, auditable policy setup that:

1. Restricts who can create/change repos and visibility.
2. Enforces that every PR into `main` or `develop` is approved by `thontm`.
3. Scans history for secrets before public release.
4. Lives in source control so it can be re-applied, reviewed, and drift-checked.

## Goals

1. Org-level: lock down repo creation, visibility changes, outside collaborators, fork private repos, web commit signoff.
2. Per-repo (`fluxai`): branch protection on `main` and `develop` with required code-owner review, signed commits, linear history, no force-push, no direct push, even for admins.
3. Security gate: gitleaks scan over full git history before public release.
4. Track all policy as code in a separate private repo `fluxvane/org-policy`.
5. Idempotent apply scripts and a verify/diff script, run weekly by CI, that opens an issue on drift.

## Non-goals

- Auto-remediation on drift (verify only).
- Secret scanning push protection (paid plan feature).
- Org-wide required 2FA enforced via API (paid plan feature).
- Multi-org or multi-team management.
- Terraform / stateful IaC.

## Constraints

- **Free GitHub plan.** Features that return 422 on free (`secret_scanning_push_protection`, org-wide 2FA enforcement, advanced security, code-scanning default setup) must be omitted gracefully.
- **`gh` CLI only.** No Probot app, no Terraform. Single dependency besides `gh` is `yq` for yaml parsing.
- **Reversible.** Any apply script must be re-runnable with same result (PATCH/PUT semantics).
- **No secrets in policy repo.** All `*.example` files only, no real tokens or PII.

## Architecture

A separate private repo `fluxvane/org-policy` holds the policy as code:

```
fluxvane/org-policy/
├── README.md                    # how to run scripts, required token scopes
├── .github/workflows/
│   └── drift-check.yml          # weekly cron + manual dispatch
├── org/
│   ├── settings.yaml            # org-level desired state (source of truth)
│   └── apply.sh                 # PATCH /orgs/fluxvane
├── repos/
│   ├── fluxai.yaml              # per-repo desired state
│   ├── apply-fluxai.sh          # apply per-repo settings + branch protection + files
│   └── verify-fluxai.sh         # GET actual, diff vs yaml, exit 1 on drift
├── secret-scan/
│   ├── gitleaks.toml            # scan config
│   ├── scan.sh                  # one-shot local scan
│   └── preflight.sh             # full history scan, gate before public release
└── CODEOWNERS                   # @thontm owns all of this repo
```

### Apply flow

```
1. secret-scan/preflight.sh        →  clean? continue : halt, redact
2. org/apply.sh                    →  PATCH /orgs/fluxvane
3. repos/apply-fluxai.sh           →  PATCH /repos/fluxvane/fluxai
                                       PUT  /repos/fluxvane/fluxai/vulnerability-alerts
                                       PUT  /repos/fluxvane/fluxai/automated-security-fixes
                                       PUT  .../branches/main/protection
                                       PUT  .../branches/develop/protection
                                       PUT  .../contents/.github/CODEOWNERS
                                       PUT  .../contents/.github/dependabot.yml
4. repos/verify-fluxai.sh          →  report drift, exit 0/1
5. (manual) gh repo edit fluxvane/fluxai --visibility public
```

### Components

| Component                           | Type   | Responsibility                                           |
| ----------------------------------- | ------ | -------------------------------------------------------- |
| `org/settings.yaml`                 | data   | declare org-level desired config                         |
| `org/apply.sh`                      | script | read yaml, PATCH /orgs/fluxvane                          |
| `repos/fluxai.yaml`                 | data   | declare per-repo desired config                          |
| `repos/apply-fluxai.sh`             | script | apply per-repo + branch protection + repo files          |
| `repos/verify-fluxai.sh`            | script | GET actual, diff, exit 1 on drift                        |
| `secret-scan/preflight.sh`          | script | gitleaks full-history scan, exit 1 on findings           |
| `.github/workflows/drift-check.yml` | CI     | weekly + manual; run verify scripts; open issue on drift |

## Data model

### `org/settings.yaml`

```yaml
org: fluxvane
settings:
  members_can_create_repositories: false
  members_can_create_public_repositories: false
  members_can_create_private_repositories: false
  members_can_fork_private_repositories: false
  members_can_change_repo_visibility: false
  members_can_invite_outside_collaborators: false
  members_can_delete_repositories: false
  members_can_create_teams: true
  default_repository_permission: read
  web_commit_signoff_required: true
```

### `repos/fluxai.yaml`

```yaml
repo: fluxai
visibility: public
default_branch: main
features:
  has_issues: true
  has_projects: true
  has_wiki: false
  has_discussions: true
  allow_squash_merge: true
  allow_merge_commit: false
  allow_rebase_merge: true
  allow_auto_merge: true
  delete_branch_on_merge: true
security:
  secret_scanning: enabled
  dependabot_alerts: enabled
  dependabot_security_updates: enabled
  dependency_graph: enabled
  vulnerability_alerts: enabled
branch_protection:
  - pattern: main
    enforce_admins: true
    required_pull_request_reviews:
      required_approving_review_count: 1
      dismiss_stale_reviews: true
      require_code_owner_reviews: true
      require_last_push_approval: true
    required_status_checks:
      strict: true
      contexts: [ci/lint, ci/typecheck, ci/test, ci/build]
    required_signatures: true
    required_linear_history: true
    block_force_pushes: true
    block_deletions: true
  - pattern: develop
    # identical to main — thontm approval required, no direct push
    enforce_admins: true
    required_pull_request_reviews:
      required_approving_review_count: 1
      dismiss_stale_reviews: true
      require_code_owner_reviews: true
      require_last_push_approval: true
    required_status_checks:
      strict: true
      contexts: [ci/lint, ci/typecheck, ci/test, ci/build]
    required_signatures: true
    required_linear_history: true
    block_force_pushes: true
    block_deletions: true
```

### `CODEOWNERS` (uploaded to `fluxai/.github/CODEOWNERS`)

```
# All paths require @thontm approval
* @thontm
```

### `dependabot.yml` (uploaded to `fluxai/.github/dependabot.yml`)

```yaml
version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "weekly"
    open-pull-requests-limit: 5
    labels:
      - "dependencies"
      - "security"
```

## Apply script logic

### `org/apply.sh`

1. `set -euo pipefail`
2. Read `org/settings.yaml` with `yq` and emit keys.
3. Build JSON body from non-paid-feature keys.
4. `gh api -X PATCH /orgs/fluxvane --input body.json`
5. On 422 with `requires_paid_plan` body → print and continue.
6. On other non-2xx → print body, exit 1.
7. `gh api /orgs/fluxvane` and print final values for confirmation.

### `repos/apply-fluxai.sh`

1. `set -euo pipefail`
2. `gh api -X PATCH /repos/fluxvane/fluxai --input repo-patch.json` (visibility, default_branch, merge settings, features).
3. `gh api -X PUT /repos/fluxvane/fluxai/vulnerability-alerts`.
4. `gh api -X PUT /repos/fluxvane/fluxai/automated-security-fixes`.
5. For each branch in `branch_protection`:
   - Build protection body from yaml.
   - `gh api -X PUT /repos/fluxvane/fluxai/branches/{pattern}/protection --input protection.json`.
6. Upload `CODEOWNERS` via Contents API (base64 encoded, commit message "chore: add CODEOWNERS (thontm)").
7. Upload `dependabot.yml` via Contents API (commit message "chore: enable Dependabot").

### `repos/verify-fluxai.sh`

1. `set -euo pipefail`
2. For each yaml key: GET actual via `gh api`, compare to yaml, print `[OK]` or `[DRIFT] key: expected=X, actual=Y`.
3. For each branch: GET `.../branches/{pattern}/protection`, compare required_review_count, enforce_admins, etc.
4. For CODEOWNERS / dependabot.yml: GET contents, decode, compare.
5. Exit 0 if all OK, 1 if any drift.

### `secret-scan/preflight.sh`

1. `set -euo pipefail`
2. `gitleaks detect --no-banner --source . --report-path leaks.json --redact`.
3. If leaks.json non-empty or gitleaks exits 1 → print findings, exit 1.
4. Additional pattern check: `git ls-files | grep -E '(\.env$|/\.env\.|/secrets/|id_rsa|.*\.pem$|.*\.key$)'`. Any match → print, exit 1.
5. On clean: print "no secrets detected", exit 0.

### `.github/workflows/drift-check.yml`

- `on: schedule: cron: "0 6 * * 1"` (weekly Monday 06:00 UTC) + `workflow_dispatch`.
- `permissions: contents: read, issues: write, pull-requests: read`.
- Job: install `yq`, `gh` auth via `GH_TOKEN` secret, run `repos/verify-fluxai.sh` and a future `org/verify-org.sh`.
- On non-zero exit: `gh issue create --title "[drift] org-policy drift detected" --body "verify script exit non-zero"`.

## Error handling

- `gh api` non-2xx → `set -e` halts script, prints response body with `jq` pretty-print.
- 422 with `requires_paid_plan` message → print "feature requires paid plan, skipping", continue.
- 403 → print "token scope insufficient", halt.
- `gitleaks` findings → halt apply flow entirely, do not proceed to flip public.
- YAML parse error → halt with line/column from yq.
- Branch protection API rejecting `enforce_admins` on free plan → tested separately, fall back to false with a printed warning that admin bypass remains possible.

## Security baseline summary (free-plan compatible)

| Layer      | Setting                                             | Source                              |
| ---------- | --------------------------------------------------- | ----------------------------------- |
| Org        | members_can_create_repositories = false             | `org/settings.yaml`                 |
| Org        | members_can_change_repo_visibility = false          | `org/settings.yaml`                 |
| Org        | web_commit_signoff_required = true                  | `org/settings.yaml`                 |
| Repo       | vulnerability_alerts = on                           | `repos/apply-fluxai.sh`             |
| Repo       | automated_security_fixes (Dependabot) = on          | `repos/apply-fluxai.sh`             |
| Repo       | secret_scanning (free, retroactive) = on            | `repos/apply-fluxai.sh`             |
| Branch     | required_pull_request_reviews with code_owner = 1   | `repos/fluxai.yaml`                 |
| Branch     | dismiss_stale_reviews, require_last_push_approval   | `repos/fluxai.yaml`                 |
| Branch     | required_signatures (GPG)                           | `repos/fluxai.yaml`                 |
| Branch     | enforce_admins = true (best effort)                 | `repos/fluxai.yaml`                 |
| Branch     | block_force_pushes, block_deletions, linear history | `repos/fluxai.yaml`                 |
| Files      | CODEOWNERS @thontm, dependabot.yml npm weekly       | `repos/apply-fluxai.sh`             |
| Pre-public | gitleaks full-history scan                          | `secret-scan/preflight.sh`          |
| Drift      | weekly CI verify + issue on drift                   | `.github/workflows/drift-check.yml` |

## Known limitations (free plan)

- Push-time secret blocking: not available. Mitigated by gitleaks preflight + branch protection.
- Org-wide 2FA enforcement via API: not available. Mitigated by requiring `thontm` account 2FA manually (out of scope of this script).
- Code-scanning (CodeQL) default setup: not available. Optional manual setup later if upgraded.
- Admin bypass on branch protection: GitHub allows it; `enforce_admins: true` is best effort. `thontm` retains admin override if explicitly needed.

## Rollback

- `apply-*.sh` re-runnable with current yaml = same result (idempotent).
- To roll back a change: edit yaml, commit, re-run apply.
- To remove branch protection: set branch entry to disabled, re-run apply.
- No state file to manage (not Terraform). Drift is detected, not hidden.

## Out of scope

- Hooking this into a Slack/Discord alert.
- Adding 2FA recovery codes backup automation.
- Migrating to paid plan (would unblock push protection and org-wide 2FA API).
- Adding more repos to policy (extend `repos/*.yaml` and add per-repo `apply-*.sh`).
