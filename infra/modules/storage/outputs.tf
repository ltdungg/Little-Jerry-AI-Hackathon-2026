output "raw_bucket_name" { value = aws_s3_bucket.buckets["raw"].id }
output "curated_bucket_name" { value = aws_s3_bucket.buckets["curated"].id }
output "artifact_bucket_name" { value = aws_s3_bucket.buckets["artifact"].id }
output "access_logs_bucket_name" { value = aws_s3_bucket.logs.id }
output "raw_bucket_arn" { value = aws_s3_bucket.buckets["raw"].arn }
output "curated_bucket_arn" { value = aws_s3_bucket.buckets["curated"].arn }
output "artifact_bucket_arn" { value = aws_s3_bucket.buckets["artifact"].arn }
