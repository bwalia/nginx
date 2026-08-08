provider "aws" {
  region = "${var.aws_region}"

  # No credentials here by design. The provider resolves them from the
  # standard AWS chain:
  #   - CI: injected by aws-actions/configure-aws-credentials from
  #     GitHub Actions secrets (see .github/workflows/terraform.yml)
  #   - Local: AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY env vars,
  #     or a named profile in ~/.aws/credentials
  version = "~> 2.7"
}
