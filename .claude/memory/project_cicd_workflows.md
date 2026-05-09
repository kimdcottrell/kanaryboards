---
name: CI/CD GitHub Actions workflows
description: Auto-PR creation and E2E test workflows — when they fire, what they need, and known quirks
type: project
---

## auto-create-pr.yml

Fires on push to `feature/**` or `bugfix/**`. Idempotent: checks `gh pr list --head <branch>` before creating. Creates PR titled `WIP: <branch-name>` against `main` with label `enhancement`. Requires `contents: write` and `pull-requests: write` permissions.

## e2e.yml

Fires on every pull request. Steps:
1. Poll GitHub Statuses API (`/repos/.../statuses/<sha>`) every 10 s (max 24 × = 4 min) until a status with `context == "deploy/kimdcottrell/kanaryboards"` and `state == "success"` appears.
2. Extract `REVISION_ID` from the target URL, then poll the Deno Deploy API (`/v2/revisions/<id>/timelines`) every 5 s (max 12 ×) until a `preview` slug domain appears.
3. Set `BASE_URL=https://<domain>` and run `npx playwright test`.
4. Upload `playwright-report/` as an artifact (30-day retention), even on cancellation.

**Why:** Tests must run against the live Deno Deploy preview, not localhost. The double-poll (deploy status → domain live) is required because the status check fires before the domain is routable.

**Secrets required:**
- `DENO_DEPLOY_TOKEN` — used to query the Deno Deploy revisions API
- `GITHUB_TOKEN` — provided automatically; used to create PRs and query statuses
