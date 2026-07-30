---
name: project_cloudflare_infra_ownership
description: Wrangler owns everything the app touches; OpenTofu (infra/) owns only DNS + API tokens. Nothing is managed by both — and the Worker script is deliberately excluded from OpenTofu.
metadata:
  type: project
---

Decided 2026-07-30 when moving off Deno Deploy. **One rule: wrangler owns anything the application touches; OpenTofu owns account-level infra that outlives any deploy. Nothing is managed by both.**

| Owner | Resources |
| --- | --- |
| **wrangler** (from GitHub Actions) | Worker script + assets (prod and `pr-<n>`), all `BOARD_KV` namespaces, the adapter's auto-provisioned `SESSION` KV, Pages report deployments, bindings/vars/compat flags in `wrangler.jsonc` |
| **OpenTofu** (`infra/`) | `cloudflare_workers_custom_domain` for `kanby.ai`, `cloudflare_account_token`s |
| **neither** | app secrets — `wrangler secret put` / `--secrets-file` |

**Why the Worker script is deliberately NOT in OpenTofu:** `wrangler deploy` runs on every merge, so if OpenTofu also managed the script, every deploy would show up as out-of-band drift in the next `tofu plan`. Keeping script deploys wrangler-only and routing OpenTofu-only avoids a permanent fight.

**No workspaces.** Per-PR environments are created and destroyed by wrangler in CI, so this state only ever describes production. (An earlier plan used one workspace per PR; that was dropped when wrangler took over per-PR provisioning, since Cloudflare's git integration can't provision a per-branch KV namespace and OpenTofu was only being dragged in to do that.)

**`infra/` lives in this repo, which is public.** Consequences:
- `account_id` / `zone_id` are variables with **no committed defaults**, supplied via `TF_VAR_*` from GitHub Environment secrets in CI and a gitignored `*.auto.tfvars` locally.
- State goes in an R2 bucket via the S3-compatible `backend "s3"`. The backend block can't interpolate variables, and the endpoint contains the account id, so bucket/endpoint are passed with `-backend-config` at `tofu init`. R2 needs every AWS preflight skipped (`skip_credentials_validation`, `skip_region_validation`, `skip_metadata_api_check`, `skip_requesting_account_id`, `use_path_style`) and auth via `AWS_ACCESS_KEY_ID`/`AWS_SECRET_ACCESS_KEY` set to R2 token creds.
- ⚠️ **`cloudflare_account_token.value` is written to state in plaintext**, so the R2 bucket is as sensitive as the tokens. Never output it; read with `tofu state show`.
- **The state bucket is deliberately not OpenTofu-managed** — a bucket holding the state that describes itself is a footgun, since one careless destroy takes the state with it. Bootstrap with `wrangler r2 bucket create`.
- Bootstrap is circular: creating the managed tokens needs a token that can manage tokens. Use a temporary hand-made admin token for the first apply, then switch to the managed CI token and revoke the temp one.

**`manage_custom_domain` defaults to `false`** — applying it *is* the production cutover, since it repoints live apex DNS. Until then the Worker is reachable only on `*.workers.dev`.

**Unfinished:** `tofu_token_permission_group_ids` still carries the original ~47-ID list, drafted when OpenTofu was expected to manage Workers scripts and KV. It doesn't anymore, so the grant is almost certainly too wide. The IDs are opaque UUIDs — list them via `/user/tokens/permission_groups` (see `infra/README.md`) before pruning; don't guess. Nothing in `infra/` has been through `tofu init/validate/plan` yet either (no tofu binary in the dev container).

See [[project_cicd_workflows]] for the workflow set that drives wrangler, and [[project_stack]] for the adapter change.
