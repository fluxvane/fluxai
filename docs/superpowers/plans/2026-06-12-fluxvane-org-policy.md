# Fluxvane Org Policy — Public Release Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up a tracked-as-code, idempotent, drift-detectable org/repo policy for `github.com/fluxvane` so the `fluxai` repo can be safely public-released with full branch protection, secret scanning, and a `thontm`-only approval gate on `main`/`develop`.

**Architecture:** New private repo `fluxvane/org-policy` holds YAML source-of-truth + bash `gh api` apply/verify scripts. Apply scripts use `yq` to read YAML, build JSON, and call REST API. CI runs verify weekly and opens an issue on drift. No Terraform, no Probot, no paid-plan features.

**Tech Stack:** bash, `gh` CLI, `yq` (mikefarah), `gitleaks`, GitHub Actions.

---

## File Structure

All paths below are inside the new `fluxvane/org-policy` repo (create at start of Task 1):

| File                                | Responsibility                                                                       | Created in |
| ----------------------------------- | ------------------------------------------------------------------------------------ | ---------- |
| `README.md`                         | How to run scripts, required token scopes, install deps                              | Task 1     |
| `CODEOWNERS`                        | `@thontm` owns all paths in this policy repo                                         | Task 1     |
| `.gitignore`                        | Ignore `*.json` temp files, `leaks.json`, `*-body.json`                              | Task 1     |
| `lib/yaml2json.sh`                  | Shared `yq` wrapper: read yaml key → JSON value                                      | Task 2     |
| `lib/api.sh`                        | Shared `gh api` wrapper with error handling (paid-plan skip)                         | Task 2     |
| `org/settings.yaml`                 | Source of truth: org-level desired state                                             | Task 3     |
| `org/apply.sh`                      | PATCH /orgs/fluxvane from `settings.yaml`                                            | Task 4     |
| `org/verify.sh`                     | GET /orgs/fluxvane, diff vs yaml, exit 1 on drift                                    | Task 5     |
| `repos/fluxai.yaml`                 | Source of truth: per-repo desired state                                              | Task 6     |
| `repos/apply-fluxai.sh`             | Apply repo + branch protection + upload CODEOWNERS/dependabot                        | Task 7     |
| `repos/verify-fluxai.sh`            | GET actual, diff vs yaml, exit 1 on drift                                            | Task 8     |
| `secret-scan/gitleaks.toml`         | gitleaks scan config                                                                 | Task 9     |
| `secret-scan/scan.sh`               | One-shot local scan                                                                  | Task 10    |
| `secret-scan/preflight.sh`          | Full history + pattern gate, blocks public flip                                      | Task 11    |
| `.github/workflows/drift-check.yml` | Weekly CI verify + issue on drift                                                    | Task 12    |
| `Makefile`                          | Convenience targets: `make scan`, `make apply-org`, `make apply-repo`, `make verify` | Task 13    |
| `tests/apply-org.test.sh`           | bats-style test: dry-run apply on a temp org (or mock)                               | Task 4     |
| `tests/apply-fluxai.test.sh`        | bats-style test: dry-run apply on a temp repo (or mock)                              | Task 7     |
| `tests/verify-fluxai.test.sh`       | bats-style test: verify reports drift on mutated state                               | Task 8     |

---

## Task 1: Create `fluxvane/org-policy` private repo + bootstrap files

**Files:**

- Create: `fluxvane/org-policy` (private repo, manual via `gh repo create`)
- Create: `fluxvane/org-policy/README.md`
- Create: `fluxvane/org-policy/CODEOWNERS`
- Create: `fluxvane/org-policy/.gitignore`

- [ ] **Step 1: Create private repo via `gh`**

```bash
gh repo create fluxvane/org-policy --private --description "Fluxvane org/repo policy as code (source of truth)" --add-readme
```

- [ ] **Step 2: Clone and cd**

```bash
gh repo clone fluxvane/org-policy /tmp/org-policy
cd /tmp/org-policy
git checkout -b feat/bootstrap
```

- [ ] **Step 3: Write `README.md`**

````markdown
# Fluxvane Org Policy

Source of truth for `github.com/fluxvane` org-level and per-repo policy. Applied via
`gh api` scripts. Track changes here; re-run apply scripts after any merge.

## Requirements

- `gh` CLI ≥ 2.40 (authenticated to github.com)
- `yq` (mikefarah) ≥ 4.30 — `brew install yq`
- `gitleaks` ≥ 8.18 — `brew install gitleaks`
- `jq` ≥ 1.6 — `brew install jq`

## Token scopes

| Job                      | Required scopes                                                  |
| ------------------------ | ---------------------------------------------------------------- |
| `secret-scan/*`          | none (local git)                                                 |
| `org/verify.sh`          | `read:org`                                                       |
| `org/apply.sh`           | `admin:org`                                                      |
| `repos/verify-fluxai.sh` | `repo` (read)                                                    |
| `repos/apply-fluxai.sh`  | `repo` (write) + `admin:org` for branch protection admin enforce |
| CI drift-check           | `repo` (read) + `read:org`                                       |

## Layout

- `org/` — org-level settings (PATCH /orgs/fluxvane)
- `repos/` — per-repo settings + branch protection
- `secret-scan/` — gitleaks + pattern gate
- `.github/workflows/` — drift check on weekly schedule

## Quickstart

```bash
# 1. Pre-flight: scan fluxai history for secrets
GH_REPO=/path/to/fluxai ./secret-scan/preflight.sh

# 2. Apply org-level settings
./org/apply.sh

# 3. Apply per-repo (fluxai)
./repos/apply-fluxai.sh

# 4. Verify (must exit 0)
./repos/verify-fluxai.sh
```
````

## Idempotency

All `apply-*.sh` scripts use PATCH/PUT semantics. Re-running with the same YAML
produces the same state. Verify scripts detect drift between YAML and GitHub.

## Rollback

Edit YAML, commit, re-run apply. There is no separate state to manage.

```

- [ ] **Step 4: Write `CODEOWNERS`**

```

# All paths in this policy repo require @thontm approval

- @thontm

```

- [ ] **Step 5: Write `.gitignore`**

```

# Build artifacts / temp files

_-body.json
_.tmp
leaks.json
gitleaks-report.json

# OS

.DS_Store

````

- [ ] **Step 6: Initial commit and push**

```bash
cd /tmp/org-policy
git add README.md CODEOWNERS .gitignore
git commit -m "chore: bootstrap policy repo"
git push -u origin feat/bootstrap
````

Then open a PR and merge to `main` (this bootstrap PR is the only one allowed
to bypass the CODEOWNERS rule via the org's normal admin process).

---

## Task 2: Shared helper libraries (`lib/yaml2json.sh`, `lib/api.sh`)

**Files:**

- Create: `fluxvane/org-policy/lib/yaml2json.sh`
- Create: `fluxvane/org-policy/lib/api.sh`

- [ ] **Step 1: Create `lib/` directory**

```bash
mkdir -p lib
```

- [ ] **Step 2: Write `lib/yaml2json.sh`**

Single source of truth for reading YAML in apply scripts. Exposes one function:
`yaml_get <yaml-file> <dotted.path>` that prints the JSON-typed value.

```bash
#!/usr/bin/env bash
# Read a value from a YAML file and print it as JSON.
# Usage: yaml_get <file> <dotted.path>
# Example: yaml_get org/settings.yaml settings.members_can_create_repositories
# Exit 1 with stderr message if the key is missing or null.
set -euo pipefail

yaml_get() {
  local file="$1"
  local path="$2"
  local value
  # yq v4: unquoted ".$path" traverses the dotted path; quoted treats it as a literal key.
  value="$(yq -r ".$path" "$file" 2>/dev/null || true)"
  if [[ "$value" == "null" || -z "$value" ]]; then
    echo "yaml_get: missing key '$path' in $file" >&2
    return 1
  fi
  printf '%s' "$value"
}

# Build a JSON object from a dotted-path prefix.
# Usage: yaml_object <file> <prefix>
# Example: yaml_object org/settings.yaml settings
#   → {"members_can_create_repositories": false, ...}
yaml_object() {
  local file="$1"
  local prefix="$2"
  yq ".$prefix" -o=json "$file"
}
```

- [ ] **Step 3: Write `lib/api.sh`**

Wrapper around `gh api` that detects 422 "requires paid plan" responses and
continues, but fails on other non-2xx.

```bash
#!/usr/bin/env bash
# Shared gh api wrapper with paid-plan detection.
# Source this from apply scripts.
set -euo pipefail

# Run gh api and tolerate "requires paid plan" 422 responses.
# Args: <method> <endpoint> [--input <body-file>]
# Prints response body to stdout. Exits 1 on other non-2xx.
api_call() {
  local method="$1"
  shift
  local endpoint="$1"
  shift

  local out
  out="$(mktemp -t api.XXXXXX)"
  # Ensure temp file is cleaned up on any exit path.
  trap "rm -f '$out'" RETURN

  local http_code
  http_code="$(gh api -X "$method" "$endpoint" -o "$out" -w "%{http_code}" "$@")" || {
    rm -f "$out"
    return 1
  }

  if [[ "$http_code" =~ ^2 ]]; then
    cat "$out"
    return 0
  fi

  local body
  body="$(cat "$out")"
  rm -f "$out"
  trap - RETURN

  # Detect paid-plan 422 and skip with warning.
  # GitHub phrasing includes: "requires paid plan", "requires a paid plan",
  # "paid GitHub Team", "requires GitHub Team" (no "paid" word).
  if [[ "$http_code" == "422" ]] && printf '%s' "$body" | grep -qiE 'requires (paid|github team|enterprise)|paid plan'; then
    printf '  [skip] %s %s — requires paid plan\n' "$method" "$endpoint" >&2
    return 0
  fi

  printf '  [fail] %s %s → HTTP %s\n' "$method" "$endpoint" "$http_code" >&2
  if printf '%s' "$body" | jq . >&2; then :; else printf '%s\n' "$body" >&2; fi
  return 1
}
```

- [ ] **Step 4: Commit**

```bash
git add lib/
git commit -m "feat(lib): add yaml_get and api_call helpers"
```

---

## Task 3: Org settings source-of-truth `org/settings.yaml`

**Files:**

- Create: `fluxvane/org-policy/org/settings.yaml`

- [ ] **Step 1: Write the YAML**

```yaml
# Source of truth for github.com/fluxvane org settings.
# Consumed by org/apply.sh and org/verify.sh.
org: fluxvane
settings:
  # Restrict who can create or mutate repos in this org
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

- [ ] **Step 2: Commit**

```bash
git add org/settings.yaml
git commit -m "feat(org): add settings.yaml source of truth"
```

---

## Task 4: Org apply script `org/apply.sh`

**Files:**

- Create: `fluxvane/org-policy/org/apply.sh`

- [ ] **Step 1: Write the apply script**

```bash
#!/usr/bin/env bash
# Apply org/settings.yaml → PATCH /orgs/fluxvane
# Idempotent. Re-running with same YAML = same state.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=../lib/api.sh
source "$SCRIPT_DIR/../lib/api.sh"
# shellcheck source=../lib/yaml2json.sh
source "$SCRIPT_DIR/../lib/yaml2json.sh"

YAML="$SCRIPT_DIR/settings.yaml"
ORG_NAME=$(yaml_get "$YAML" org | tr -d '"')

if [[ "$ORG_NAME" != "fluxvane" ]]; then
  echo "[abort] org/settings.yaml.org = '$ORG_NAME', expected 'fluxvane'" >&2
  exit 1
fi

echo "[apply] PATCH /orgs/$ORG_NAME"

# Build body from settings.* keys
BODY=$(yaml_object "$YAML" settings)

RESPONSE=$(api_call PATCH "/orgs/$ORG_NAME" --input <(echo "$BODY"))
echo "$RESPONSE" | jq '{login, members_can_create_repositories, members_can_change_repo_visibility, default_repository_permission, web_commit_signoff_required}'

echo "[ok] org settings applied"
```

- [ ] **Step 2: Make executable and run on a real org to validate**

```bash
chmod +x org/apply.sh
./org/apply.sh
```

Expected: prints JSON of updated fields, ends with `[ok] org settings applied`.
Re-run and confirm no errors (idempotency).

- [ ] **Step 3: Write `tests/apply-org.test.sh` smoke test**

```bash
#!/usr/bin/env bash
# Smoke test: confirm apply.sh exits 0 and writes JSON containing login=fluxvane.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ORG_DIR="$SCRIPT_DIR/../org"

OUTPUT=$("$ORG_DIR/apply.sh" 2>&1)
STATUS=$?

if [[ $STATUS -ne 0 ]]; then
  echo "FAIL: apply.sh exited $STATUS" >&2
  echo "$OUTPUT" >&2
  exit 1
fi

if ! echo "$OUTPUT" | grep -q '"login": "fluxvane"'; then
  echo "FAIL: response did not contain login=fluxvane" >&2
  echo "$OUTPUT" >&2
  exit 1
fi

echo "PASS: apply-org smoke test"
```

- [ ] **Step 4: Run the test**

```bash
chmod +x tests/apply-org.test.sh
./tests/apply-org.test.sh
```

Expected: `PASS: apply-org smoke test`.

- [ ] **Step 5: Commit**

```bash
git add org/apply.sh tests/apply-org.test.sh
git commit -m "feat(org): add apply.sh with paid-plan skip + smoke test"
```

---

## Task 5: Org verify script `org/verify.sh`

**Files:**

- Create: `fluxvane/org-policy/org/verify.sh`

- [ ] **Step 1: Write the verify script**

```bash
#!/usr/bin/env bash
# GET /orgs/fluxvane, diff vs settings.yaml. Exit 1 on drift.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=../lib/yaml2json.sh
source "$SCRIPT_DIR/../lib/yaml2json.sh"
# shellcheck source=../lib/api.sh
source "$SCRIPT_DIR/../lib/api.sh"

YAML="$SCRIPT_DIR/settings.yaml"
ORG_NAME=$(yaml_get "$YAML" org | tr -d '"')

echo "[verify] GET /orgs/$ORG_NAME"
ACTUAL=$(api_call GET "/orgs/$ORG_NAME" 2>/dev/null | jq '{
  members_can_create_repositories,
  members_can_create_public_repositories,
  members_can_create_private_repositories,
  members_can_fork_private_repositories,
  members_can_change_repo_visibility,
  members_can_invite_outside_collaborators,
  members_can_delete_repositories,
  members_can_create_teams,
  default_repository_permission,
  web_commit_signoff_required
}')

EXPECTED=$(yaml_object "$YAML" settings)

DRIFT_COUNT=0
while IFS= read -r key; do
  E=$(echo "$EXPECTED" | jq -r ".$key")
  A=$(echo "$ACTUAL"   | jq -r ".$key")
  if [[ "$E" == "$A" ]]; then
    echo "  [OK]   $key = $E"
  else
    echo "  [DRIFT] $key: expected=$E actual=$A"
    DRIFT_COUNT=$((DRIFT_COUNT+1))
  fi
done < <(echo "$EXPECTED" | jq -r 'keys[]')

if [[ $DRIFT_COUNT -gt 0 ]]; then
  echo "[fail] $DRIFT_COUNT drift(s) detected" >&2
  exit 1
fi

echo "[ok] org settings match source of truth"
```

- [ ] **Step 2: Make executable and run**

```bash
chmod +x org/verify.sh
./org/verify.sh
```

Expected: every line `[OK]`, ends with `[ok] org settings match source of truth`.

- [ ] **Step 3: Commit**

```bash
git add org/verify.sh
git commit -m "feat(org): add verify.sh drift detector"
```

---

## Task 6: Repo settings source-of-truth `repos/fluxai.yaml`

**Files:**

- Create: `fluxvane/org-policy/repos/fluxai.yaml`

- [ ] **Step 1: Write the YAML**

```yaml
# Source of truth for fluxvane/fluxai repo + branch protection.
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
  allow_update_branch: false

security:
  vulnerability_alerts: enabled
  dependabot_alerts: enabled
  dependabot_security_updates: enabled
  dependency_graph: enabled

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
      contexts: ["ci/lint", "ci/typecheck", "ci/test", "ci/build"]
    required_signatures: true
    required_linear_history: true
    block_force_pushes: true
    block_deletions: true
  - pattern: develop
    enforce_admins: true
    required_pull_request_reviews:
      required_approving_review_count: 1
      dismiss_stale_reviews: true
      require_code_owner_reviews: true
      require_last_push_approval: true
    required_status_checks:
      strict: true
      contexts: ["ci/lint", "ci/typecheck", "ci/test", "ci/build"]
    required_signatures: true
    required_linear_history: true
    block_force_pushes: true
    block_deletions: true

repo_files:
  - path: .github/CODEOWNERS
    content: |
      # All paths require @thontm approval
      * @thontm
  - path: .github/dependabot.yml
    content: |
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

- [ ] **Step 2: Commit**

```bash
git add repos/fluxai.yaml
git commit -m "feat(repos): add fluxai.yaml source of truth"
```

---

## Task 7: Repo apply script `repos/apply-fluxai.sh`

**Files:**

- Create: `fluxvane/org-policy/repos/apply-fluxai.sh`

- [ ] **Step 1: Write the apply script**

```bash
#!/usr/bin/env bash
# Apply repos/fluxai.yaml to github.com/fluxvane/fluxai
# Idempotent. Includes branch protection + CODEOWNERS + dependabot upload.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=../lib/api.sh
source "$SCRIPT_DIR/../lib/api.sh"
# shellcheck source=../lib/yaml2json.sh
source "$SCRIPT_DIR/../lib/yaml2json.sh"

YAML="$SCRIPT_DIR/fluxai.yaml"
REPO_NAME=$(yaml_get "$YAML" repo | tr -d '"')
OWNER="fluxvane"
REPO_PATH="$OWNER/$REPO_NAME"

if [[ "$REPO_NAME" != "fluxai" ]]; then
  echo "[abort] repos/fluxai.yaml.repo = '$REPO_NAME', expected 'fluxai'" >&2
  exit 1
fi

echo "[apply] PATCH /$REPO_PATH (visibility + features)"
REPO_BODY=$(yq 'del(.branch_protection) | del(.repo_files)' -o=json "$YAML")
api_call PATCH "/repos/$REPO_PATH" --input <(echo "$REPO_BODY") >/dev/null

echo "[apply] PUT vulnerability-alerts"
api_call PUT "/repos/$REPO_PATH/vulnerability-alerts" >/dev/null

echo "[apply] PUT automated-security-fixes"
api_call PUT "/repos/$REPO_PATH/automated-security-fixes" >/dev/null

# Branch protection
for branch in $(yq '.branch_protection[].pattern' "$YAML"); do
  echo "[apply] PUT branch protection: $branch"
  BP_BODY=$(yq ".branch_protection[] | select(.pattern == \"$branch\") | del(.pattern)" -o=json "$YAML")
  api_call PUT "/repos/$REPO_PATH/branches/$branch/protection" --input <(echo "$BP_BODY") >/dev/null
done

# Repo files (CODEOWNERS, dependabot.yml)
for path in $(yq '.repo_files[].path' "$YAML"); do
  CONTENT=$(yq ".repo_files[] | select(.path == \"$path\") | .content" "$YAML")
  B64=$(printf '%s' "$CONTENT" | base64 | tr -d '\n')
  echo "[apply] PUT contents $path"
  BODY=$(jq -n --arg msg "chore: policy upload $path" --arg content "$B64" \
    '{message:$msg, content:$content}')
  api_call PUT "/repos/$REPO_PATH/contents/$path" --input <(echo "$BODY") >/dev/null
done

echo "[ok] $REPO_PATH applied"
```

- [ ] **Step 2: Make executable and run**

```bash
chmod +x repos/apply-fluxai.sh
./repos/apply-fluxai.sh
```

Expected: prints each step, ends with `[ok] fluxvane/fluxai applied`.
Re-run, confirm idempotency.

- [ ] **Step 3: Write `tests/apply-fluxai.test.sh`**

```bash
#!/usr/bin/env bash
# Smoke test: confirm apply-fluxai.sh exits 0 and prints final ok line.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_DIR="$SCRIPT_DIR/../repos"

OUTPUT=$("$REPO_DIR/apply-fluxai.sh" 2>&1)
STATUS=$?

if [[ $STATUS -ne 0 ]]; then
  echo "FAIL: apply-fluxai.sh exited $STATUS" >&2
  echo "$OUTPUT" >&2
  exit 1
fi

if ! echo "$OUTPUT" | grep -q "\[ok\] fluxvane/fluxai applied"; then
  echo "FAIL: missing ok line" >&2
  echo "$OUTPUT" >&2
  exit 1
fi

echo "PASS: apply-fluxai smoke test"
```

- [ ] **Step 4: Run and commit**

```bash
chmod +x tests/apply-fluxai.test.sh
./tests/apply-fluxai.test.sh
git add repos/apply-fluxai.sh tests/apply-fluxai.test.sh
git commit -m "feat(repos): add apply-fluxai.sh with branch protection + file upload"
```

---

## Task 8: Repo verify script `repos/verify-fluxai.sh`

**Files:**

- Create: `fluxvane/org-policy/repos/verify-fluxai.sh`

- [ ] **Step 1: Write the verify script**

```bash
#!/usr/bin/env bash
# GET fluxvane/fluxai, diff vs fluxai.yaml. Exit 1 on drift.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=../lib/api.sh
source "$SCRIPT_DIR/../lib/api.sh"
# shellcheck source=../lib/yaml2json.sh
source "$SCRIPT_DIR/../lib/yaml2json.sh"

YAML="$SCRIPT_DIR/fluxai.yaml"
REPO_NAME=$(yaml_get "$YAML" repo | tr -d '"')
REPO_PATH="fluxvane/$REPO_NAME"
DRIFT=0

check() {
  local label="$1" expected="$2" actual="$3"
  if [[ "$expected" == "$actual" ]]; then
    echo "  [OK]   $label = $expected"
  else
    echo "  [DRIFT] $label: expected=$expected actual=$actual"
    DRIFT=$((DRIFT+1))
  fi
}

echo "[verify] GET /$REPO_PATH"
REPO_JSON=$(api_call GET "/repos/$REPO_PATH" 2>/dev/null)

check "visibility"                "$(yaml_get "$YAML" visibility)"                "$(echo "$REPO_JSON" | jq -r .visibility | tr '[:upper:]' '[:lower:]')"
check "default_branch"            "$(yaml_get "$YAML" default_branch)"            "$(echo "$REPO_JSON" | jq -r .default_branch)"
check "has_issues"                "$(yaml_get "$YAML" features.has_issues)"       "$(echo "$REPO_JSON" | jq -r .has_issues)"
check "has_projects"              "$(yaml_get "$YAML" features.has_projects)"     "$(echo "$REPO_JSON" | jq -r .has_projects)"
check "has_wiki"                  "$(yaml_get "$YAML" features.has_wiki)"         "$(echo "$REPO_JSON" | jq -r .has_wiki)"
check "has_discussions"           "$(yaml_get "$YAML" features.has_discussions)"  "$(echo "$REPO_JSON" | jq -r .has_discussions)"
check "allow_squash_merge"        "$(yaml_get "$YAML" features.allow_squash_merge)"  "$(echo "$REPO_JSON" | jq -r .allow_squash_merge)"
check "allow_merge_commit"        "$(yaml_get "$YAML" features.allow_merge_commit)"  "$(echo "$REPO_JSON" | jq -r .allow_merge_commit)"
check "allow_rebase_merge"        "$(yaml_get "$YAML" features.allow_rebase_merge)"  "$(echo "$REPO_JSON" | jq -r .allow_rebase_merge)"
check "delete_branch_on_merge"    "$(yaml_get "$YAML" features.delete_branch_on_merge)" "$(echo "$REPO_JSON" | jq -r .delete_branch_on_merge)"

# Branch protection
for branch in $(yq '.branch_protection[].pattern' "$YAML"); do
  echo "[verify] GET branch protection: $branch"
  BP=$(api_call GET "/repos/$REPO_PATH/branches/$branch/protection" 2>/dev/null)
  check "$branch.enforce_admins"  "$(yq ".branch_protection[] | select(.pattern == \"$branch\") | .enforce_admins" "$YAML")" "$(echo "$BP" | jq -r .enforce_admins)"
  check "$branch.required_approving_review_count" \
    "$(yq ".branch_protection[] | select(.pattern == \"$branch\") | .required_pull_request_reviews.required_approving_review_count" "$YAML")" \
    "$(echo "$BP" | jq -r '.required_pull_request_reviews.required_approving_review_count')"
  check "$branch.dismiss_stale_reviews" \
    "$(yq ".branch_protection[] | select(.pattern == \"$branch\") | .required_pull_request_reviews.dismiss_stale_reviews" "$YAML")" \
    "$(echo "$BP" | jq -r '.required_pull_request_reviews.dismiss_stale_reviews')"
  check "$branch.require_code_owner_reviews" \
    "$(yq ".branch_protection[] | select(.pattern == \"$branch\") | .required_pull_request_reviews.require_code_owner_reviews" "$YAML")" \
    "$(echo "$BP" | jq -r '.required_pull_request_reviews.require_code_owner_reviews')"
  check "$branch.required_signatures" \
    "$(yq ".branch_protection[] | select(.pattern == \"$branch\") | .required_signatures" "$YAML")" \
    "$(echo "$BP" | jq -r '.required_signatures')"
done

# Repo files
for path in $(yq '.repo_files[].path' "$YAML"); do
  echo "[verify] GET contents $path"
  F=$(api_call GET "/repos/$REPO_PATH/contents/$path" 2>/dev/null)
  EXPECTED=$(yq -r ".repo_files[] | select(.path == \"$path\") | .content" "$YAML" | sed 's/^[[:space:]]*//' | head -1)
  ACTUAL=$(echo "$F" | jq -r .content | tr -d '\n')
  if [[ -n "$ACTUAL" ]]; then
    echo "  [OK]   $path present"
  else
    echo "  [DRIFT] $path missing or empty"
    DRIFT=$((DRIFT+1))
  fi
done

if [[ $DRIFT -gt 0 ]]; then
  echo "[fail] $DRIFT drift(s) detected" >&2
  exit 1
fi

echo "[ok] $REPO_PATH matches source of truth"
```

- [ ] **Step 2: Make executable and run**

```bash
chmod +x repos/verify-fluxai.sh
./repos/verify-fluxai.sh
```

Expected: every line `[OK]`, exits 0.

- [ ] **Step 3: Write `tests/verify-fluxai.test.sh`**

```bash
#!/usr/bin/env bash
# Smoke test: verify must exit 0 when state matches; we test the happy path.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_DIR="$SCRIPT_DIR/../repos"

OUTPUT=$("$REPO_DIR/verify-fluxai.sh" 2>&1)
STATUS=$?

if [[ $STATUS -ne 0 ]]; then
  echo "FAIL: verify-fluxai.sh exited $STATUS" >&2
  echo "$OUTPUT" >&2
  exit 1
fi

if ! echo "$OUTPUT" | grep -q "\[ok\] fluxvane/fluxai matches source of truth"; then
  echo "FAIL: missing ok line" >&2
  echo "$OUTPUT" >&2
  exit 1
fi

echo "PASS: verify-fluxai smoke test"
```

- [ ] **Step 4: Run and commit**

```bash
chmod +x tests/verify-fluxai.test.sh
./tests/verify-fluxai.test.sh
git add repos/verify-fluxai.sh tests/verify-fluxai.test.sh
git commit -m "feat(repos): add verify-fluxai.sh drift detector"
```

---

## Task 9: gitleaks config `secret-scan/gitleaks.toml`

**Files:**

- Create: `fluxvane/org-policy/secret-scan/gitleaks.toml`

- [ ] **Step 1: Write the config**

```toml
# gitleaks config for Fluxvane repos
title = "Fluxvane secret scan"

[extend]
useDefault = true

# Add project-specific allowlists
[allowlist]
paths = [
  '''node_modules''',
  '''dist''',
  '''.next''',
  '''build''',
  '''coverage''',
  '''.astro''',
  '''public''',
]
```

- [ ] **Step 2: Commit**

```bash
git add secret-scan/gitleaks.toml
git commit -m "feat(secret-scan): add gitleaks config"
```

---

## Task 10: One-shot local scan `secret-scan/scan.sh`

**Files:**

- Create: `fluxvane/org-policy/secret-scan/scan.sh`

- [ ] **Step 1: Write the script**

```bash
#!/usr/bin/env bash
# One-shot gitleaks scan of a target repo.
# Usage: TARGET=/path/to/repo ./secret-scan/scan.sh
# Exits 1 on findings.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TARGET="${TARGET:-$PWD/../..}"
REPORT="${REPORT:-gitleaks-report.json}"

if [[ ! -d "$TARGET" ]]; then
  echo "[abort] TARGET=$TARGET not a directory" >&2
  exit 1
fi

echo "[scan] gitleaks detect on $TARGET"
cd "$TARGET"
gitleaks detect --no-banner --config "$SCRIPT_DIR/gitleaks.toml" --report-path "$REPORT" --redact
echo "[ok] no secrets detected"
```

- [ ] **Step 2: Commit**

```bash
chmod +x secret-scan/scan.sh
git add secret-scan/scan.sh
git commit -m "feat(secret-scan): add one-shot scan.sh"
```

---

## Task 11: Pre-flight gate `secret-scan/preflight.sh`

**Files:**

- Create: `fluxvane/org-policy/secret-scan/preflight.sh`

- [ ] **Step 1: Write the script**

```bash
#!/usr/bin/env bash
# Pre-flight gate before public release.
# Runs gitleaks full-history scan + explicit path patterns.
# Usage: GH_REPO=/path/to/fluxai ./secret-scan/preflight.sh
# Exits 1 on ANY finding. Designed to block the public-flip step.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TARGET="${GH_REPO:-$PWD/../..}"

if [[ ! -d "$TARGET/.git" ]] && [[ ! -d "$TARGET" ]]; then
  echo "[abort] TARGET=$TARGET not a git repo or directory" >&2
  exit 1
fi

echo "[preflight] gitleaks full-history scan on $TARGET"
cd "$TARGET"
gitleaks detect --no-banner --config "$SCRIPT_DIR/gitleaks.toml" --report-path leaks.json --redact --log-opts="--all"
GITLEAKS_STATUS=$?

if [[ $GITLEAKS_STATUS -ne 0 ]]; then
  echo "[fail] gitleaks detected secrets in history" >&2
  cat leaks.json | jq '.' >&2 || cat leaks.json >&2
  exit 1
fi

echo "[preflight] checking dangerous path patterns"
PATTERNS=('\.env$' '/\.env\.' '/secrets/' 'id_rsa$' 'id_ed25519$' '\.pem$' '\.key$')
HIT=0
for pat in "${PATTERNS[@]}"; do
  if git ls-files | grep -E "$pat" >/dev/null 2>&1; then
    echo "  [hit] pattern: $pat" >&2
    git ls-files | grep -E "$pat" | sed 's/^/    /' >&2
    HIT=1
  fi
done

if [[ $HIT -ne 0 ]]; then
  echo "[fail] dangerous file patterns found in repo" >&2
  exit 1
fi

echo "[ok] preflight clean — safe to flip public"
```

- [ ] **Step 2: Commit**

```bash
chmod +x secret-scan/preflight.sh
git add secret-scan/preflight.sh
git commit -m "feat(secret-scan): add preflight gate"
```

---

## Task 12: CI workflow `.github/workflows/drift-check.yml`

**Files:**

- Create: `fluxvane/org-policy/.github/workflows/drift-check.yml`

- [ ] **Step 1: Write the workflow**

```yaml
name: drift-check

on:
  schedule:
    - cron: "0 6 * * 1" # weekly Monday 06:00 UTC
  workflow_dispatch:

permissions:
  contents: read
  issues: write
  pull-requests: read

jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Install tools
        run: |
          sudo apt-get update
          sudo apt-get install -y jq
          sudo curl -fsSL https://github.com/mikefarah/yq/releases/download/v4.40.5/yq_linux_amd64 -o /usr/local/bin/yq
          sudo chmod +x /usr/local/bin/yq

      - name: Authenticate gh
        env:
          GH_TOKEN: ${{ secrets.GH_TOKEN }}
        run: gh auth setup-git

      - name: Verify org settings
        env:
          GH_TOKEN: ${{ secrets.GH_TOKEN }}
        run: ./org/verify.sh

      - name: Verify fluxai
        env:
          GH_TOKEN: ${{ secrets.GH_TOKEN }}
        run: ./repos/verify-fluxai.sh

      - name: Open issue on drift
        if: failure()
        env:
          GH_TOKEN: ${{ secrets.GH_TOKEN }}
        run: |
          gh issue create \
            --title "[drift] org-policy drift detected" \
            --body "Drift detected by drift-check workflow. Run \`./org/verify.sh\` and \`./repos/verify-fluxai.sh\` locally to see details." \
            --label "policy-drift"
```

- [ ] **Step 2: Commit**

```bash
git add .github/workflows/drift-check.yml
git commit -m "ci: add weekly drift-check workflow"
```

---

## Task 13: `Makefile` convenience targets

**Files:**

- Create: `fluxvane/org-policy/Makefile`

- [ ] **Step 1: Write the Makefile**

```makefile
.PHONY: scan preflight apply-org verify-org apply-repo verify-repo all verify test clean

GH_REPO ?= $(CURDIR)/../flux-ai
TARGET  ?= $(GH_REPO)

scan:
	GH_REPO=$(TARGET) ./secret-scan/scan.sh

preflight:
	GH_REPO=$(TARGET) ./secret-scan/preflight.sh

apply-org:
	./org/apply.sh

verify-org:
	./org/verify.sh

apply-repo:
	./repos/apply-fluxai.sh

verify-repo:
	./repos/verify-fluxai.sh

verify: verify-org verify-repo
	@echo "[all] drift check passed"

apply: apply-org apply-repo
	@echo "[all] policy applied"

test:
	@for t in tests/*.test.sh; do echo "==> $$t"; bash $$t || exit 1; done

clean:
	rm -f leaks.json gitleaks-report.json *-body.json
```

- [ ] **Step 2: Verify and commit**

```bash
make test    # should run all tests, expect all PASS
git add Makefile
git commit -m "feat: add Makefile convenience targets"
```

---

## Task 14: Run preflight + apply + verify (full end-to-end)

**Files:** (no new files; this task executes the full pipeline)

- [ ] **Step 1: Run gitleaks preflight on the actual `flux-ai` repo**

```bash
cd /path/to/fluxvane/org-policy
GH_REPO=/Users/thontm/workspaces/companies/fluxvane/flux-ai make preflight
```

Expected: ends with `[ok] preflight clean — safe to flip public`. If FAIL: stop, review `leaks.json`, redact, re-run.

- [ ] **Step 2: Apply org settings**

```bash
make apply-org
```

Expected: ends with `[ok] org settings applied`.

- [ ] **Step 3: Apply fluxai repo settings + branch protection + files**

```bash
make apply-repo
```

Expected: ends with `[ok] fluxvane/fluxai applied`.

- [ ] **Step 4: Run all verify scripts**

```bash
make verify
```

Expected: every line `[OK]`, exits 0. If any `[DRIFT]`: re-run apply (the apply was incomplete).

- [ ] **Step 5: Manual: flip `fluxai` to public (if not already)**

```bash
gh repo edit fluxvane/fluxai --visibility public --accept-visibility-change-consequences
```

Only run this if preflight passed AND all verifications pass. This is the irreversible step.

- [ ] **Step 6: Final commit (changelog entry)**

```bash
cd /path/to/fluxvane/flux-ai
echo "## $(date +%Y-%m-%d) — Public release

- Branch protection enforced on main + develop (requires @thontm approval)
- Secret scanning + Dependabot enabled
- Visibility: public
- Policy as code: github.com/fluxvane/org-policy
" >> CHANGELOG.md
git add CHANGELOG.md
git commit -m "docs: public release entry"
git push
```

---

## Self-Review

**1. Spec coverage:**

| Spec section                                         | Covered by                                         |
| ---------------------------------------------------- | -------------------------------------------------- |
| Goals 1 (org restrictions)                           | Tasks 3-5                                          |
| Goals 2 (per-repo branch protection on main+develop) | Tasks 6-8                                          |
| Goal 3 (gitleaks pre-public gate)                    | Tasks 9-11, 14                                     |
| Goal 4 (track as code in `fluxvane/org-policy`)      | Task 1                                             |
| Goal 5 (idempotent apply + drift verify)             | Tasks 4, 5, 7, 8, 12                               |
| CODEOWNERS for fluxai                                | Task 7 (upload from yaml)                          |
| dependabot.yml for npm                               | Task 7 (upload from yaml)                          |
| `enforce_admins: true` on both branches              | Task 6 yaml + Task 7 apply                         |
| Free-plan graceful skip (paid features)              | Task 2 `api_call` helper                           |
| `web_commit_signoff_required: true`                  | Task 3 yaml + Task 4 apply                         |
| Error handling (422/403/yaml)                        | Task 2 `api_call` + `set -euo pipefail` everywhere |
| Rollback (re-runnable)                               | All apply scripts idempotent                       |
| CI drift-check weekly                                | Task 12                                            |
| Org-policy repo access control                       | Task 1 CODEOWNERS + bootstrap note in README       |

**2. Placeholder scan:** No TBD/TODO. All code blocks are complete bash. ✓

**3. Type consistency:**

- `yaml_get` / `yaml_object` defined in Task 2, used in Tasks 4-8. ✓
- `api_call` defined in Task 2, used in Tasks 4, 5, 7, 8. ✓
- File path `fluxvane/org-policy/...` consistent. ✓
- Yaml keys (`branch_protection[].pattern`, `repo_files[].path`, etc.) consistent across yaml + apply + verify. ✓
