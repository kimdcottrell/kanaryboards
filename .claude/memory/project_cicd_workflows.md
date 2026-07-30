---
name: CI/CD GitHub Actions workflows
description: The Cloudflare Workers deploy/preview/cleanup/rollback workflow set — what fires when, the two hard constraints that shaped it, and required secrets
metadata:
  type: project
---

Migrated from Deno Deploy to Cloudflare Workers on 2026-07-30. **Wrangler owns everything the app touches** (Worker script, all KV namespaces, Pages report hosting); OpenTofu owns only account-level infra (DNS, API tokens). Nothing is managed by both — see [[project_cloudflare_infra_ownership]].

## The workflow set

| Workflow | Trigger | Does |
| --- | --- | --- |
| `deploy-production.yml` | push to `main`, dispatch | build → `wrangler deploy` → smoke check → auto-rollback on failure |
| `rollback-production.yml` | dispatch (`version_id` optional, `reason` required) | `wrangler rollback` to an explicit or previous version |
| `pr-checks.yml` | `pull_request` | preview Worker + KV, then `[e2e, lighthouse]` matrix, then one assembled report deploy |
| `cleanup-pr-envs.yml` | `pull_request: closed` | deletes the Worker, its KV namespaces, and report Pages deployments |
| `infra.yml` | `infra/**` changes | `tofu fmt/validate/plan`; `apply` on main behind approval |
| `static-analysis.yml` | `pull_request` | fmt/lint/check + `wrangler types` |
| `vitest.yml` | `pull_request` | both test pools (`vitest` and `vitest:workers`) |
| `auto-create-pr.yml` | push to any branch except `main`, `dependabot/**` | opens a WIP PR if none exists |

Deleted in the migration: `e2e.yml`, `generate-lighthouse-report.yml`, `.github/actions/deno-deploy-preview-url`. `cleanup-pr-pages-deployments.yml` became `cleanup-pr-envs.yml`.

## Naming convention

| Resource | Production | Per PR |
| --- | --- | --- |
| Worker | `kanby` | `pr-<n>` |
| KV namespace | `kanby-BOARD_KV` | `pr-<n>-BOARD_KV` |
| Pages report branch | — | `report-pr-<n>` |

The `report-` prefix exists so cleanup can filter report deployments without matching the app's own `pr-<n>` naming.

## Two constraints that shaped this — don't undo them

**1. `wrangler deploy` has `--name` and `--var` but no KV-binding flag.** A per-PR namespace id can only reach the Worker through config. `pr-checks.yml` therefore derives a complete `wrangler.pr.json` from `wrangler.jsonc` using `@std/jsonc`, overriding only `name` and the `BOARD_KV` id. It must be written to the **repo root** (gitignored) because wrangler resolves `main` and `assets.directory` relative to the config file's directory. Note `wrangler kv namespace create --update-config` is *not* sufficient on its own: the id is also needed on re-runs where nothing is created.

**2. A Cloudflare Pages deployment serves one complete directory, immutably** — there is no partial/merge upload. Two workflows deploying to the same branch would silently clobber each other, which is why e2e and Lighthouse are one workflow that assembles `report/{playwright,lighthouse/mobile,lighthouse/desktop}` and deploys **once**. A `workflow_run`-based aggregator was rejected: it runs in default-branch context where `github.event.pull_request` is empty (a trap the old `e2e.yml` documented having already hit).

## GitHub Environments

Secrets live in **`Production`**, **`Preview`**, and **`Production Infra`** environments, not as plain repo secrets. The branch limiter is declared in the workflow YAML, not left to environment settings:

```yaml
environment:
  name: ${{ github.ref == 'refs/heads/main' && 'Production' || 'Preview' }}
```

**Every job needing secrets must declare `environment:`** — including the e2e matrix leg and `publish-report`. A job without it sees *empty* secrets, which surfaces as a confusing auth failure rather than a clear error.

## Idempotency and cleanup gotchas

- `wrangler kv namespace create` **fails if the title exists**, and PR workflows re-run on every push. Resolve the id from `kv namespace list` first, create only when absent.
- `cleanup-pr-envs.yml` is deliberately **not** gated on `merged == true`. The old version was, so a PR closed *without* merging leaked its Worker and KV namespace forever.
- Cleanup also removes `<worker>-*` namespaces (the Astro adapter auto-provisions a `SESSION` KV per Worker), or they accumulate one dead namespace per PR.
- Namespace matching is anchored (`== $ns` or `startswith($worker + "-")`) so PR 4 can never delete PR 42's or production's data.

## Secrets and build-time vs runtime

Runtime secrets go in on **every** deploy via `wrangler deploy --secrets-file` (a fresh preview Worker starts with none, which would break e2e). Written with `printf` into `$RUNNER_TEMP` — never the workspace, or `publish-report` could sweep the file into a Pages deployment. The flag is additive, so it won't clobber dashboard-set secrets.

⚠️ **`E2E_TEST_USER_ID` must be set for preview builds and must NOT be set for production.** It's `import.meta.env` (build-time inlined) and is the only thing gating `/api/delete-test-data`; the board-persistence specs assert it returns 200, so previews need it, and production's safety depends on its absence.

Build-time (inlined by Vite, must be present at build): `PUBLIC_CLERK_PUBLISHABLE_KEY`, `PUBLIC_CLERK_JS_VERSION`, `GOOGLE_TAG`, `MODE`.
Runtime (via `--secrets-file`, read through `cloudflare:workers` `env`): `CLERK_SECRET_KEY`, `RESEND_API_KEY`, `GOOGLE_AI_STUDIO_KEY`.

**Required secrets:** `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_ZONE_ID`, `TF_STATE_ACCESS_KEY_ID`, `TF_STATE_SECRET_ACCESS_KEY`, plus the Clerk/Resend/Google keys above.
**Required *variables*** (not secrets): `GOOGLE_TAG`, `PUBLIC_CLERK_JS_VERSION`, `TF_STATE_BUCKET`. If unset they're silently empty — analytics just stops working with no error.

## Rollback (production only)

Previews get no rollback: a broken preview is a red check, and the next push replaces the Worker.

- Auto: `deploy-production.yml` snapshots the live version **before** deploying, then smoke-checks. Probing `/api/board` for a `401` is deliberate — a 200 on the homepage only proves prerendered HTML serves, whereas a 401 (not a 500) proves the Worker booted *and* resolved its KV binding.
- Manual: `rollback-production.yml`, sharing the `deploy-production` concurrency group so a rollback and an in-flight deploy can't interleave.
- Resolve rollback targets from `wrangler deployments list --json`, not `versions list` — the latter includes versions that were uploaded but never deployed, which aren't valid targets.
- ⚠️ **Rollback reverts code and bindings, not KV data.** A bad release that wrote malformed board JSON stays broken after rollback; this is why `PersistedBoardSchema` validation in `src/pages/api/board.ts` matters.
