// Points the apex domain at the production Worker.
//
// This is the only thing OpenTofu manages about the Worker — the script itself is
// deployed by `wrangler deploy` from .github/workflows/deploy-production.yml.
// Two tools managing one Worker script is a reliable source of drift, so the
// split is: wrangler owns the code, OpenTofu owns where traffic goes.
//
// Gated off by default: applying this repoints live apex DNS, which is the
// production cutover. Flip `manage_custom_domain` when you're ready for that.
resource "cloudflare_workers_custom_domain" "production" {
  count = var.manage_custom_domain ? 1 : 0

  account_id = var.account_id
  zone_id    = var.zone_id
  zone_name  = var.zone_name
  hostname   = var.hostname
  service    = var.worker_name
}
