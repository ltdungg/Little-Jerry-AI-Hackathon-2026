output "kms_app_arn" { value = aws_kms_key.app_data.arn }
output "kms_app_key_id" { value = aws_kms_key.app_data.key_id }
output "kms_secrets_arn" { value = aws_kms_key.secrets.arn }
output "kms_secrets_key_id" { value = aws_kms_key.secrets.key_id }
