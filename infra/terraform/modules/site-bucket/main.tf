variable "environment" {
  description = "Environment name (dev, staging, prod)"
  type        = string
}

variable "bucket_name" {
  description = "Globally unique private S3 bucket name for presenca-site static assets"
  type        = string
}

variable "enabled" {
  description = "Whether to provision active S3 resources (false keeps prod dormant until activation)"
  type        = bool
  default     = true
}

variable "kms_key_arn" {
  description = "Optional KMS CMK ARN for SSE-KMS encryption (falls back to AES256 when null)"
  type        = string
  default     = null
}

variable "cloudfront_distribution_arn" {
  description = "Optional CloudFront distribution ARN allowed to read objects via Origin Access Control (OAC)"
  type        = string
  default     = ""
}

variable "ec2_reader_role_arn" {
  description = "Optional EC2 IAM Role ARN allowed to sync static site objects on Dev (Caddy)"
  type        = string
  default     = ""
}

resource "aws_s3_bucket" "site" {
  count  = var.enabled ? 1 : 0
  bucket = var.bucket_name
}

resource "aws_s3_bucket_versioning" "site" {
  count  = var.enabled ? 1 : 0
  bucket = aws_s3_bucket.site[0].id

  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_public_access_block" "site" {
  count                   = var.enabled ? 1 : 0
  bucket                  = aws_s3_bucket.site[0].id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_server_side_encryption_configuration" "site" {
  count  = var.enabled ? 1 : 0
  bucket = aws_s3_bucket.site[0].id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm     = var.kms_key_arn != null ? "aws:kms" : "AES256"
      kms_master_key_id = var.kms_key_arn
    }
    bucket_key_enabled = var.kms_key_arn != null
  }
}

resource "aws_s3_bucket_lifecycle_configuration" "site" {
  count  = var.enabled ? 1 : 0
  bucket = aws_s3_bucket.site[0].id

  rule {
    id     = "cleanup-noncurrent-versions-and-incomplete-uploads"
    status = "Enabled"

    filter {}

    noncurrent_version_expiration {
      noncurrent_days = 30
    }

    abort_incomplete_multipart_upload {
      days_after_initiation = 1
    }
  }
}

data "aws_iam_policy_document" "site_bucket_policy" {
  count = var.enabled ? 1 : 0

  statement {
    sid     = "DenyInsecureTransportTLSRequired"
    effect  = "Deny"
    actions = ["s3:*"]

    principals {
      type        = "*"
      identifiers = ["*"]
    }

    resources = [
      aws_s3_bucket.site[0].arn,
      "${aws_s3_bucket.site[0].arn}/*",
    ]

    condition {
      test     = "Bool"
      variable = "aws:SecureTransport"
      values   = ["false"]
    }
  }

  dynamic "statement" {
    for_each = var.cloudfront_distribution_arn != "" ? [1] : []
    content {
      sid     = "AllowCloudFrontOACReadOnly"
      effect  = "Allow"
      actions = ["s3:GetObject"]

      principals {
        type        = "Service"
        identifiers = ["cloudfront.amazonaws.com"]
      }

      resources = ["${aws_s3_bucket.site[0].arn}/*"]

      condition {
        test     = "StringEquals"
        variable = "AWS:SourceArn"
        values   = [var.cloudfront_distribution_arn]
      }
    }
  }

  dynamic "statement" {
    for_each = var.ec2_reader_role_arn != "" ? [1] : []
    content {
      sid     = "AllowDevEc2RoleReadOnlySync"
      effect  = "Allow"
      actions = ["s3:GetObject", "s3:ListBucket"]

      principals {
        type        = "AWS"
        identifiers = [var.ec2_reader_role_arn]
      }

      resources = [
        aws_s3_bucket.site[0].arn,
        "${aws_s3_bucket.site[0].arn}/*",
      ]
    }
  }
}

resource "aws_s3_bucket_policy" "site" {
  count      = var.enabled ? 1 : 0
  bucket     = aws_s3_bucket.site[0].id
  policy     = data.aws_iam_policy_document.site_bucket_policy[0].json
  depends_on = [aws_s3_bucket_public_access_block.site]
}

output "bucket_name" {
  value = var.enabled ? aws_s3_bucket.site[0].bucket : null
}

output "bucket_arn" {
  value = var.enabled ? aws_s3_bucket.site[0].arn : null
}

output "bucket_regional_domain_name" {
  value = var.enabled ? aws_s3_bucket.site[0].bucket_regional_domain_name : null
}
