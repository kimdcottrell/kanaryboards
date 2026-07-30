# infra — OpenTofu-managed Cloudflare resources

OpenTofu manages only the **account-level, long-lived** slice of Cloudflare here.
Everything the application touches is owned by wrangler.

| Owner | Resources |
| --- | --- |
| **wrangler** (from GitHub Actions) | the Worker script and assets, all KV namespaces (production and per-PR), Pages report deployments, bindings/vars in `../wrangler.jsonc` |
| **OpenTofu** (this directory) | the custom domain routing `kanby.ai` to the production Worker, the API tokens OpenTofu authenticates with |
| **neither** | app secrets — set with `wrangler secret put` or `--secrets-file` from CI |

Nothing is managed by both. In particular OpenTofu never manages the Worker
*script*: `wrangler deploy` does that on every merge to `main`, and having both
tools own it would show every deploy as drift in the next `tofu plan`.

There are no workspaces. Per-PR environments are created and destroyed by
wrangler in CI, so this state only ever describes production.

## One-time bootstrap

1. **Create the state bucket** (not managed by OpenTofu — a bucket that stores the
   state describing itself is a footgun; a careless destroy would take the state
   with it):

   ```sh
   deno run -A npm:wrangler r2 bucket create kanby-tofu-state
   ```

2. **Create an R2 API token** (Account → R2 → Manage API tokens) with object
   read/write on that bucket. The S3-compatible backend reads it as AWS-style
   credentials:

   ```sh
   export AWS_ACCESS_KEY_ID="<r2 access key id>"
   export AWS_SECRET_ACCESS_KEY="<r2 secret access key>"
   ```

3. **Create a short-lived admin API token** by hand for the very first apply —
   the managed tokens in `tokens.tf` cannot create themselves:

   ```sh
   export CLOUDFLARE_API_TOKEN="<temporary admin token>"
   ```

4. **Supply the identifiers.** They are deliberately not committed (this repo is
   public). Locally, create `terraform.auto.tfvars` — gitignored:

   ```hcl
   account_id = "..."
   zone_id    = "..."
   ```

5. **Init and apply:**

   ```sh
   export CF_ACCOUNT_ID="..."      # same value as account_id
   tofu init \
     -backend-config="bucket=kanby-tofu-state" \
     -backend-config="endpoints={s3=\"https://$CF_ACCOUNT_ID.r2.cloudflarestorage.com\"}"
   tofu plan
   tofu apply
   ```

6. **Switch to the managed tokens.** Read the new values out of state and store
   them: the CI one as `CLOUDFLARE_API_TOKEN` in the GitHub `Production`
   environment, the local one in your shell profile. Then revoke the temporary
   admin token from step 3.

   ```sh
   tofu state show cloudflare_account_token.opentofu_ci
   ```

## State is sensitive

`cloudflare_account_token.value` is stored in state **in plaintext**. Treat the
R2 bucket as a secret store:

- keep it private, and scope its R2 token to just this bucket;
- never commit state (`.gitignore` covers `*.tfstate*`);
- rotating a token means a new state write, so the bucket needs versioning or
  backups if you want recoverability.

## Day-to-day

```sh
tofu fmt          # before committing
tofu validate
tofu plan
```

CI (`.github/workflows/infra.yml`) runs `fmt -check`, `validate` and `plan` on
pull requests touching `infra/**`, and `apply` on merge to `main` behind the
`Production` environment's approval gate.

## Pruning the token permissions

`tofu_token_permission_group_ids` in `variables.tf` still carries the original
broad list, which assumed OpenTofu would also manage Workers scripts and KV. It
does not, so most of those grants are unnecessary. To see what each ID actually
allows:

```sh
curl -s -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
  https://api.cloudflare.com/client/v4/user/tokens/permission_groups \
  | jq -r '.result[] | "\(.id)\t\(.name)"' | sort -k2
```

Keep DNS, R2 and API-token permissions; drop the rest.

## The production cutover

`manage_custom_domain` defaults to `false`, so `kanby.ai` is untouched and the
Worker is reachable only on its `*.workers.dev` URL. Setting it to `true` and
applying **is** the cutover — do that only after manually verifying the Cloudflare
deployment, and revisit whether `deploy-production.yml` should gain an approval
gate at the same time, since from then on every merge reaches real users.
