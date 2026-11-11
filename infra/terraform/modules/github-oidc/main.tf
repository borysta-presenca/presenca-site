variable "environment" {
  description = "Environment name (dev, staging, prod)"
  type        = string
}

variable "enabled" {
  description = "Whether to provision the GitHub OIDC deploy role"
  type        = bool
  default     = true
}

variable "github_repository" {
  description = "GitHub repository in owner/repo format"
  type        = string
  default     = "borysta-presenca/presenca-site"
}

variable "github_immutable_sub_prefix" {
  description = "GitHub immutable OIDC subject prefix (owner@orgId/repo@repoId)"
  type        = string
  default     = "repo:borysta-presenca@333961937/presenca-site@1430269123"
}

variable "allowed_git_branch" {
  description = "Exact Git branch allowed to assume this deploy role (develop, homol, main)"
  type        = string
}

variable "existing_oidc_provider_arn" {
  description = "ARN of existing GitHub OIDC provider in the AWS account"
  type        = string
}

variable "site_bucket_arn" {
  description = "ARN of the S3 bucket allowed for deployment sync"
  type        = string
}

variable "cloudfront_distribution_arn" {
  description = "Optional CloudFront distribution ARN allowed for cache invalidation"
  type        = string
  default     = ""
}

variable "dev_ec2_instance_arn" {
  description = "Optional Dev EC2 instance ARN allowed for SSM RunCommand site sync"
  type        = string
  default     = ""
}

data "aws_region" "current" {}

data "aws_iam_policy_document" "github_trust" {
  count = var.enabled ? 1 : 0

  statement {
    sid     = "AllowGitHubActionsBranchStrict"
    effect  = "Allow"
    actions = ["sts:AssumeRoleWithWebIdentity"]

    principals {
      type        = "Federated"
      identifiers = [var.existing_oidc_provider_arn]
    }

    condition {
      test     = "StringEquals"
      variable = "token.actions.githubusercontent.com:aud"
      values   = ["sts.amazonaws.com"]
    }

    condition {
      test     = "StringEquals"
      variable = "token.actions.githubusercontent.com:sub"
      values = distinct([
        "repo:${var.github_repository}:ref:refs/heads/${var.allowed_git_branch}",
        "repo:${var.github_repository}:environment:${var.environment == "prod" ? "production" : var.environment}",
        "repo:${var.github_repository}:environment:${var.environment}",
        "${var.github_immutable_sub_prefix}:ref:refs/heads/${var.allowed_git_branch}",
        "${var.github_immutable_sub_prefix}:environment:${var.environment == "prod" ? "production" : var.environment}",
        "${var.github_immutable_sub_prefix}:environment:${var.environment}",
      ])
    }
  }
}

resource "aws_iam_role" "github_deploy" {
  count              = var.enabled ? 1 : 0
  name               = "presenca-site-${var.environment}-github-deploy"
  description        = "GitHub Actions CD role for presenca-site (${var.environment}) restricted to branch ${var.allowed_git_branch}"
  assume_role_policy = data.aws_iam_policy_document.github_trust[0].json
}

data "aws_iam_policy_document" "github_permissions" {
  count = var.enabled ? 1 : 0

  statement {
    sid    = "S3ListSiteBucket"
    effect = "Allow"
    actions = [
      "s3:ListBucket",
      "s3:GetBucketLocation",
    ]
    resources = [var.site_bucket_arn]
  }

  statement {
    sid    = "S3SyncSiteObjects"
    effect = "Allow"
    actions = [
      "s3:GetObject",
      "s3:PutObject",
      "s3:DeleteObject",
    ]
    resources = ["${var.site_bucket_arn}/*"]
  }

  dynamic "statement" {
    for_each = var.cloudfront_distribution_arn != "" ? [1] : []
    content {
      sid    = "CloudFrontInvalidateScoped"
      effect = "Allow"
      actions = [
        "cloudfront:CreateInvalidation",
        "cloudfront:GetInvalidation",
      ]
      resources = [var.cloudfront_distribution_arn]
    }
  }

  dynamic "statement" {
    for_each = var.dev_ec2_instance_arn != "" ? [1] : []
    content {
      sid     = "SSMTriggerDevSiteSyncScoped"
      effect  = "Allow"
      actions = ["ssm:SendCommand"]
      resources = [
        var.dev_ec2_instance_arn,
        "arn:aws:ssm:${data.aws_region.current.name}::document/AWS-RunShellScript",
      ]
    }
  }

  dynamic "statement" {
    for_each = var.dev_ec2_instance_arn != "" ? [1] : []
    content {
      sid    = "SSMReadCommandInvocation"
      effect = "Allow"
      actions = [
        "ssm:GetCommandInvocation",
        "ssm:ListCommandInvocations",
      ]
      resources = ["*"]
    }
  }
}

resource "aws_iam_role_policy" "github_deploy" {
  count  = var.enabled ? 1 : 0
  name   = "presenca-site-${var.environment}-github-deploy-policy"
  role   = aws_iam_role.github_deploy[0].id
  policy = data.aws_iam_policy_document.github_permissions[0].json
}

output "deploy_role_arn" {
  value = var.enabled ? aws_iam_role.github_deploy[0].arn : null
}
