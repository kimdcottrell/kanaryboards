// API tokens OpenTofu itself authenticates with.
//
// Two separate tokens on purpose: a leaked CI secret should not also hand over a
// developer's local credential, and they can be rotated and expired
// independently. Same permission set for now (see the variable's warning about
// pruning it).
//
// ⚠️ Both tokens' `value` attributes are written to OpenTofu state in plaintext.
// That makes the R2 state bucket as sensitive as the tokens themselves — see
// README.md. The values are deliberately NOT exposed as outputs; read them with
// `tofu state show` when provisioning, or rotate through the dashboard.
//
// Bootstrap order matters: creating these requires an existing token with
// permission to manage tokens. Use a short-lived manually-created admin token
// for the first apply, then switch to the token created here.

locals {
  # Restrict the tokens to this account's resources.
  token_resources = jsonencode({
    "com.cloudflare.api.account.${var.account_id}" = "*"
  })

  token_policies = [{
    effect            = "allow"
    permission_groups = [for id in var.tofu_token_permission_group_ids : { id = id }]
    resources         = local.token_resources
  }]
}

resource "cloudflare_account_token" "opentofu_localdev" {
  account_id = var.account_id
  name       = "open-tofu-localdev"
  policies   = local.token_policies
  expires_on = var.token_expires_on
}

resource "cloudflare_account_token" "opentofu_ci" {
  account_id = var.account_id
  name       = "open-tofu-ci"
  policies   = local.token_policies
  expires_on = var.token_expires_on
}
