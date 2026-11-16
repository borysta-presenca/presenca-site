terraform {
  required_version = ">= 1.5.0"
  backend "s3" {
    bucket         = "presenca-tfstate-dev-351495784017"
    key            = "presenca-site/dev/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "presenca-tfstate-lock-dev"
  }
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = "us-east-1"
  default_tags {
    tags = {
      Project     = "PresencaSite"
      Environment = "dev"
      ManagedBy   = "Terraform"
    }
  }
}

variable "existing_oidc_provider_arn" {
  description = "ARN of existing GitHub OIDC provider in AWS account 351495784017"
  type        = string
  default     = "arn:aws:iam::351495784017:oidc-provider/token.actions.githubusercontent.com"
}

variable "dev_ec2_role_arn" {
  description = "IAM Role ARN of the Dev EC2 host running Caddy"
  type        = string
  default     = "arn:aws:iam::351495784017:role/presenca-dev-ec2-role"
}

variable "dev_ec2_instance_arn" {
  description = "ARN of the Dev EC2 instance receiving SSM site sync commands"
  type        = string
  default     = "arn:aws:ec2:us-east-1:351495784017:instance/i-0b5ba1537a5e40850"
}

module "site_bucket" {
  source              = "../../modules/site-bucket"
  environment         = "dev"
  bucket_name         = "presenca-site-dev-351495784017"
  ec2_reader_role_arn = var.dev_ec2_role_arn
}

module "github_oidc" {
  source                     = "../../modules/github-oidc"
  environment                = "dev"
  allowed_git_branch         = "develop"
  existing_oidc_provider_arn = var.existing_oidc_provider_arn
  site_bucket_arn            = module.site_bucket.bucket_arn
  dev_ec2_instance_arn       = var.dev_ec2_instance_arn
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
