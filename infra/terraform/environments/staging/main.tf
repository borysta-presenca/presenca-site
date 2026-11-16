terraform {
  required_version = ">= 1.5.0"
  backend "s3" {
    bucket         = "presenca-tfstate-staging-351495784017"
    key            = "presenca-site/staging/terraform.tfstate"
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
      Environment = "staging"
      ManagedBy   = "Terraform"
    }
  }
}

variable "existing_oidc_provider_arn" {
  description = "ARN of existing GitHub OIDC provider in AWS account 351495784017"
  type        = string
  default     = "arn:aws:iam::351495784017:oidc-provider/token.actions.githubusercontent.com"
}

variable "staging_cloudfront_distribution_arn" {
  description = "ARN of the Staging CloudFront distribution serving staging.presenca.borysta.com"
  type        = string
  default     = "arn:aws:cloudfront::351495784017:distribution/E1GAPGNQ6UKBMG"
}

module "site_bucket" {
  source                      = "../../modules/site-bucket"
  environment                 = "staging"
  bucket_name                 = "presenca-site-staging-351495784017"
  cloudfront_distribution_arn = var.staging_cloudfront_distribution_arn
}

module "github_oidc" {
  source                      = "../../modules/github-oidc"
  environment                 = "staging"
  allowed_git_branch          = "homol"
  existing_oidc_provider_arn  = var.existing_oidc_provider_arn
  site_bucket_arn             = module.site_bucket.bucket_arn
  cloudfront_distribution_arn = var.staging_cloudfront_distribution_arn
}

output "site_bucket_name" {
  value = module.site_bucket.bucket_name
}

output "site_bucket_regional_domain_name" {
  value = module.site_bucket.bucket_regional_domain_name
}

output "github_deploy_role_arn" {
  value = module.github_oidc.deploy_role_arn
}
