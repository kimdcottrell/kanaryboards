terraform {
  required_version = ">= 1.8.0"

  required_providers {
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 5.0"
    }
  }

  # State lives in an R2 bucket via the S3-compatible API.
  #
  # Intentionally almost empty: backend blocks cannot interpolate variables, and
  # the endpoint contains the Cloudflare account ID — which this public repo
  # deliberately does not carry. Supply the rest at init time:
  #
  #   tofu init \
  #     -backend-config="bucket=$TF_STATE_BUCKET" \
  #     -backend-config="endpoints={s3=\"https://$CF_ACCOUNT_ID.r2.cloudflarestorage.com\"}"
  #
  # Auth uses an R2 API token exposed as AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY
  # (R2 speaks the S3 protocol; these are R2 credentials, not AWS ones).
  backend "s3" {
    key    = "kanby/terraform.tfstate"
    region = "auto"

    # R2 is not AWS, so every AWS-specific preflight has to be skipped.
    skip_credentials_validation = true
    skip_metadata_api_check     = true
    skip_region_validation      = true
    skip_requesting_account_id  = true
    use_path_style              = true

    # State locking via S3 conditional writes rather than DynamoDB. Verify this
    # actually engages against R2 on first use — if it does not, treat applies as
    # unsafe to run concurrently (the infra.yml concurrency group is the backstop).
    use_lockfile = true
  }
}

provider "cloudflare" {
  # Sourced from CLOUDFLARE_API_TOKEN in the environment — never written here.
}
