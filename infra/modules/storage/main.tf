resource "aws_s3_bucket" "logs" { bucket = "${var.project_name}-${var.environment}-access-logs" }
resource "aws_s3_bucket_public_access_block" "logs" {
  bucket                  = aws_s3_bucket.logs.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

locals {
  bucket_types = ["raw", "curated", "artifact"]
}

resource "aws_s3_bucket" "buckets" {
  for_each = toset(local.bucket_types)
  bucket   = "${var.project_name}-${var.environment}-${each.value}"
}

resource "aws_s3_bucket_public_access_block" "buckets" {
  for_each                  = toset(local.bucket_types)
  bucket                    = aws_s3_bucket.buckets[each.value].id
  block_public_acls         = true
  block_public_policy       = true
  ignore_public_acls        = true
  restrict_public_buckets   = true
}

resource "aws_s3_bucket_versioning" "buckets" {
  for_each = toset(local.bucket_types)
  bucket   = aws_s3_bucket.buckets[each.value].id
  versioning_configuration { status = "Enabled" }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "buckets" {
  for_each = toset(local.bucket_types)
  bucket   = aws_s3_bucket.buckets[each.value].id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_logging" "buckets" {
  for_each      = toset(local.bucket_types)
  bucket        = aws_s3_bucket.buckets[each.value].id
  target_bucket = aws_s3_bucket.logs.id
  target_prefix = aws_s3_bucket.buckets[each.value].id
}

resource "aws_s3_bucket_policy" "tls_only" {
  for_each = toset(local.bucket_types)
  bucket   = aws_s3_bucket.buckets[each.value].id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Sid       = "AllowSSLRequestsOnly"
      Effect    = "Deny"
      Principal = "*"
      Action    = "s3:*"
      Resource  = ["${aws_s3_bucket.buckets[each.value].arn}", "${aws_s3_bucket.buckets[each.value].arn}/*"]
      Condition = { Bool = { "aws:SecureTransport" = "false" } }
    }]
  })
}

resource "aws_s3_bucket_lifecycle_configuration" "data_lifecycle" {
  for_each = toset([for t in local.bucket_types : t if contains(["raw", "curated"], t)])
  bucket   = aws_s3_bucket.buckets[each.value].id
  rule {
    id     = "expiry"
    status = "Enabled"
    filter {}
    expiration { days = 365 }
    noncurrent_version_expiration { noncurrent_days = 30 }
  }
}
