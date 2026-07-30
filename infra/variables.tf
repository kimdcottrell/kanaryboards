// No defaults for the identifiers: this repo is public, so the account and zone
// IDs are supplied at run time (TF_VAR_* from GitHub Environment secrets in CI,
// a gitignored *.auto.tfvars locally) rather than committed.

variable "account_id" {
  description = "Cloudflare account ID"
  type        = string
  sensitive   = true
}

variable "zone_id" {
  description = "Cloudflare zone ID for the site's domain"
  type        = string
  sensitive   = true
}

variable "zone_name" {
  description = "Apex domain of the zone (e.g. kanby.ai)"
  type        = string
  default     = "kanby.ai"
}

variable "hostname" {
  description = "Hostname to route to the production Worker"
  type        = string
  default     = "kanby.ai"
}

variable "worker_name" {
  description = <<-EOT
    Name of the production Worker to attach the custom domain to. Must match
    `name` in ../wrangler.jsonc — OpenTofu does not manage the Worker script
    itself (wrangler deploy does), it only points a hostname at it.
  EOT
  type        = string
  default     = "kanby"
}

variable "manage_custom_domain" {
  description = <<-EOT
    Whether to attach `hostname` to the production Worker.

    Keep this false until you are ready to cut production traffic over from Deno
    Deploy: applying it repoints live DNS for the apex domain.
  EOT
  type        = bool
  default     = false
}

variable "token_expires_on" {
  description = "RFC3339 expiry for the managed API tokens"
  type        = string
  default     = "2027-07-30T23:59:59Z"
}

variable "tofu_token_permission_group_ids" {
  description = <<-EOT
    Permission group IDs granted to the OpenTofu API tokens.

    ⚠️ UNREVIEWED. The default is the list originally generated for a broader
    scope that assumed OpenTofu would also manage Workers scripts and KV
    namespaces — it no longer does (wrangler owns those), so this is almost
    certainly wider than necessary. Prune it to just DNS, R2 and token
    permissions before relying on it.

    See "Pruning the token permissions" in README.md for how to list what each
    ID actually grants.
  EOT
  type        = list(string)
  default = [
    "0661ff47aa3a4786beab3b8128e0cd24",
    "eafd71286d0e4fdca404a7b4d203c5c9",
    "28f4b596e7d643029c524985477ae49a",
    "2072033d694d415a936eaeb94e6405b8",
    "82e64a83756745bbbb1c9c2701bf816b",
    "4755a26eedb94da69e1066d98aa820be",
    "b415b70a4fd1412886f164451f20405c",
    "ed07f6c337da4195b4e72a1fb2c6bcae",
    "07bea2220b2343fa9fae15656c0d8e88",
    "51be404b56244056868226263a44a632",
    "945315185a8f40518bf3e9e6d0bee126",
    "4ec32dfcb35641c5bb32d5ef1ab963b4",
    "0d24e472a9654642a97df736e8b0d980",
    "c49f8d15f9f44885a544d945ef5aa6ae",
    "de5cf65aae2140d6ba2e272db44e4fc1",
    "853643ed57244ed1a05a7c024af9ab5a",
    "5bdbde7e76144204a244274eac3eb0eb",
    "6ced5d0d69b1422396909a62c38ab41b",
    "9858d41ad0164b57b7b8cd1a1b37b1b0",
    "dbc512b354774852af2b5a5f4ba3d470",
    "20e5ea084b2f491c86b8d8d90abff905",
    "a2b55cd504d44ef18b7ba6a7f2b8fbb1",
    "d8e12db741544d1586ec1d6f5d3c7786",
    "319f5059d33a410da0fac4d35a716157",
    "7b32a91ece3140d4b3c2c56f23fc8e35",
    "93ae59e7a40c4287a57ff6e501186a63",
    "74c654eb4aac40e28d6c6caa4c5aeb3d",
    "a2431ca73b7d41f99c53303027392586",
    "211a4c0feb3e43b3a2d41f1443a433e7",
    "c4a30cd58c5d42619c86a3c36c441e2d",
    "9c88f9c5bce24ce7af9a958ba9c504db",
    "3e0b5820118e47f3922f7c989e673882",
    "fac65912d42144aa86b7dd33281bf79e",
    "8e31f574901c42e8ad89140b28d42112",
    "e9a975f628014f1d85b723993116f7d5",
    "cab5202d07ef47beae788e6bc95cb6fe",
    "1047880d37b649b49db4a504a245896f",
    "1b600d9d8062443e986a973f097e728a",
    "e17beae8b8cb423a99b1730f21238bed",
    "3245da1cf36c45c3847bb9b483c62f97",
    "e199d584e69344eba202452019deafe3",
    "7b7216b327b04b8fbc8f524e1f9b7531",
    "1b1ea24cf0904d33903f0cc7e54e280f",
    "517b21aee92c4d89936c976ba6e4be55",
    "0a6cfe8cd3ed445e918579e2fb13087b",
    "2a69899475004f5dbe8a99c5244ab23d",
    "c8fed203ed3043cba015a93ad1616f1f",
  ]
}
