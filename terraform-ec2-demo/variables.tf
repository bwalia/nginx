# AWS Config
#
# Credentials are not stored in this repo. Supply them at runtime via
# terraform.tfvars (gitignored), TF_VAR_ environment variables, or the
# standard AWS credential chain. See terraform.tfvars.example.

variable "aws_access_key" {
  description = "AWS access key ID"
  type        = string
  sensitive   = true
}

variable "aws_secret_key" {
  description = "AWS secret access key"
  type        = string
  sensitive   = true
}

variable "aws_region" {
  description = "AWS region to deploy into"
  type        = string
  default     = "eu-west-2"
}
