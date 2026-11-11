terraform {
  required_version = ">= 1.5.0"
  backend "s3" {
    bucket         = "presenca-tfstate-staging-351495784017"
    key            = "presenca-site/prod/terraform.tfstate"
    region         = "sa-east-1"
    encrypt        = true
    dynamodb_table = "presenca-tfstate-lock-staging"
  }
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = "sa-east-1"
  default_tags {
    tags = {
      Project     = "PresencaSite"
      Environment = "prod"
      ManagedBy   = "Terraform"
    }
  }
}

variable "enable_paid_runtime" {
  description = "Keep false while production environment is dormant ($0/mo); set true when activating presenca.borysta.com"
  type        = bool
  default     = false
}

variable "existing_oidc_provider_arn" {
  description = "ARN of existing GitHub OIDC provider in the target AWS account"
  type        = string
  default     = "arn:aws:iam::351495784017:oidc-provider/token.actions.githubusercontent.com"
}

variable "prod_cloudfront_distribution_arn" {
  description = "ARN of the Production CloudFront distribution once activated"
  type        = string
  default     = ""
}

module "site_bucket" {
  source                      = "../../modules/site-bucket"
  environment                 = "prod"
  enabled                     = var.enable_paid_runtime
  bucket_name                 = "presenca-site-prod-351495784017"
  cloudfront_distribution_arn = var.prod_cloudfront_distribution_arn
}

module "github_oidc" {
  source                      = "../../modules/github-oidc"
  environment                 = "prod"
  enabled                     = var.enable_paid_runtime
  allowed_git_branch          = "main"
  existing_oidc_provider_arn  = var.existing_oidc_provider_arn
  site_bucket_arn             = coalesce(module.site_bucket.bucket_arn, "arn:aws:s3:::presenca-site-prod-351495784017")
  cloudfront_distribution_arn = var.prod_cloudfront_distribution_arn
}

output "site_bucket_name" {
  value = module.site_bucket.bucket_name
}

output "github_deploy_role_arn" {
  value = module.github_oidc.deploy_role_arn
}
