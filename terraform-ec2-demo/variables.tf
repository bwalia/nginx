# AWS Config
#
# Credentials are deliberately not modelled as Terraform variables. They
# come from the AWS credential chain, sourced from GitHub Actions secrets
# in CI and from your local profile or environment otherwise.

variable "aws_region" {
  description = "AWS region to deploy into"
  type        = string
  default     = "eu-west-2"
}
